import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { haversineKm } from '../../common/utils/geo';

export interface DispatchCandidate {
  driverId: string;
  fullName: string;
  status: string;
  distanceKm: number;
  score: number;
}

export interface DispatchWeights {
  distance: number;
  rating: number;
  load: number;
}

/**
 * Dispatch Engine — a standalone backend service that selects and offers
 * orders to drivers. It is intentionally decoupled from any UI so the same
 * engine serves admin, driver app and automated dispatch.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger('DispatchService');
  private readonly weights: DispatchWeights = { distance: 0.6, rating: 0.25, load: 0.15 };
  private readonly offerTtlSeconds = 60;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Entry point invoked when an order is created. Records a dispatch run and
   * identifies eligible candidates. Actual delivery to drivers is a later
   * execution; this foundation persists every dispatch decision.
   */
  async startDispatch(
    tenantId: string,
    orderId: string,
    actor: { userId: string; ip?: string },
  ): Promise<DispatchCandidate[]> {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) return [];

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'searching_driver' },
    });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: 'pending',
        toStatus: 'searching_driver',
        changedByUserId: actor.userId,
        reason: 'dispatch started',
      },
    });

    const candidates = await this.findEligibleDrivers(
      tenantId,
      order.pickupLat,
      order.pickupLng,
      order.vehicleTypeId,
    );

    // Persist offers for the top candidates.
    for (const c of candidates.slice(0, 5)) {
      await this.prisma.orderAssignment.create({
        data: {
          tenantId,
          orderId,
          driverId: c.driverId,
          method: 'auto',
          status: 'offered',
          distanceKm: c.distanceKm,
          score: c.score,
          expiresAt: new Date(Date.now() + this.offerTtlSeconds * 1000),
        },
      });
    }

    this.logger.log(
      `Dispatch for order ${order.orderNumber}: ${candidates.length} eligible driver(s)`,
    );
    return candidates;
  }

  /** Ranks eligible drivers by a weighted score (closeness, rating, workload). */
  async findEligibleDrivers(
    tenantId: string,
    pickupLat: number | null,
    pickupLng: number | null,
    vehicleTypeId?: string | null,
  ): Promise<DispatchCandidate[]> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        tenantId,
        status: 'online',
        isAvailable: true,
        verificationStatus: 'verified',
      },
      include: {
        locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
        vehicles: { where: { isActive: true }, include: { vehicle: true } },
        orders: { where: { status: { in: ['assigned', 'driver_arriving', 'picked_up', 'in_transit', 'arriving'] } } },
      },
    });

    const candidates: DispatchCandidate[] = [];
    for (const d of drivers) {
      // Vehicle type eligibility
      if (vehicleTypeId) {
        const matches = d.vehicles.some((dv) => dv.vehicle.vehicleTypeId === vehicleTypeId);
        if (!matches) continue;
      }
      const loc = d.locations[0];
      let distanceKm = 9999;
      if (pickupLat != null && pickupLng != null && loc) {
        distanceKm = haversineKm(pickupLat, pickupLng, loc.latitude, loc.longitude);
      }
      const rating = d.rating ?? 0;
      const load = d.orders.length;
      // Lower distance/load is better; higher rating is better.
      const score =
        this.weights.distance * (1 / (1 + distanceKm)) +
        this.weights.rating * (rating / 5) +
        this.weights.load * (1 / (1 + load));
      candidates.push({ driverId: d.id, fullName: d.fullName, status: d.status, distanceKm, score });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /** Returns the current dispatch offers for an order. */
  async offers(tenantId: string, orderId: string) {
    return this.prisma.orderAssignment.findMany({
      where: { tenantId, orderId },
      orderBy: { score: 'desc' },
    });
  }

  /** Clears pending offers once an order is assigned or closed. */
  async closeForOrder(orderId: string) {
    await this.prisma.orderAssignment.updateMany({
      where: { orderId, status: 'offered' },
      data: { status: 'cancelled' },
    });
  }
}
