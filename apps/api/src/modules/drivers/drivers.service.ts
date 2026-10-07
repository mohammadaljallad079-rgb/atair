import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import {
  CreateDriverDto,
  DriverQueryDto,
  ReviewDocumentDto,
  UpdateDriverDto,
  UpdateDriverLocationDto,
} from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, q: DriverQueryDto) {
    const where = {
      tenantId,
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus as any } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search, mode: 'insensitive' as const } },
              { phone: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.driver.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, tenantId },
      include: {
        documents: true,
        vehicles: { include: { vehicle: true } },
        wallet: true,
      },
    });
    if (!driver) throw Errors.notFound('driver');
    const activeAssignment = await this.prisma.order.findFirst({
      where: {
        tenantId,
        driverId: id,
        status: { in: ['assigned', 'driver_arriving', 'picked_up', 'in_transit', 'arriving'] },
      },
      select: { id: true, orderNumber: true, status: true, total: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { ...driver, activeAssignment };
  }

  async create(tenantId: string, dto: CreateDriverDto, actor: { userId: string; ip?: string }) {
    const existing = await this.prisma.driver.findFirst({ where: { tenantId, phone: dto.phone } });
    if (existing) throw Errors.conflict('DRIVER_EXISTS', 'A driver with this phone already exists');
    const driver = await this.prisma.driver.create({
      data: { tenantId, fullName: dto.fullName, phone: dto.phone, email: dto.email?.toLowerCase(), nationalId: dto.nationalId },
    });
    await this.prisma.driverWallet.create({ data: { tenantId, driverId: driver.id } });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.create', entity: 'driver', entityId: driver.id, after: driver, ip: actor.ip,
    });
    return driver;
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto, actor: { userId: string; ip?: string }) {
    const before = await this.get(tenantId, id);
    const driver = await this.prisma.driver.update({
      where: { id: before.id },
      data: { ...dto, email: dto.email?.toLowerCase() },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.update', entity: 'driver', entityId: id, before, after: driver, ip: actor.ip,
    });
    return driver;
  }

  /** Changing driver status is validated server-side and always logged. */
  async setStatus(
    tenantId: string,
    id: string,
    status: 'offline' | 'online' | 'busy' | 'paused' | 'suspended',
    reason: string | undefined,
    actor: { userId: string; ip?: string },
  ) {
    const driver = await this.get(tenantId, id);
    if (driver.status === 'suspended' && status !== 'suspended') {
      throw Errors.conflict('DRIVER_SUSPENDED', 'Suspended drivers cannot be reactivated without verification');
    }
    const updated = await this.prisma.driver.update({
      where: { id },
      data: { status, isAvailable: status === 'online', suspendedReason: status === 'suspended' ? reason : null },
    });
    await this.prisma.driverStatusLog.create({
      data: { tenantId, driverId: id, fromStatus: driver.status, toStatus: status, reason },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.status_change', entity: 'driver', entityId: id,
      before: { status: driver.status }, after: { status }, ip: actor.ip,
    });
    return updated;
  }

  async suspend(tenantId: string, id: string, reason: string | undefined, actor: { userId: string; ip?: string }) {
    return this.setStatus(tenantId, id, 'suspended', reason, actor);
  }

  /**
   * Lifts a suspension and returns the driver to offline. Suspension is a
   * reversible operational action (never a hard delete); reactivation is
   * audited like any other status change.
   */
  async unsuspend(tenantId: string, id: string, actor: { userId: string; ip?: string }) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    if (driver.status !== 'suspended') {
      throw Errors.conflict('DRIVER_NOT_SUSPENDED', 'Driver is not currently suspended');
    }
    const updated = await this.prisma.driver.update({
      where: { id },
      data: { status: 'offline', isAvailable: false, suspendedReason: null },
    });
    await this.prisma.driverStatusLog.create({
      data: { tenantId, driverId: id, fromStatus: 'suspended', toStatus: 'offline', reason: 'unsuspended' },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.unsuspend', entity: 'driver', entityId: id,
      before: { status: 'suspended' }, after: { status: 'offline' }, ip: actor.ip,
    });
    return updated;
  }

  /** Toggles a driver's availability independently of their online status. */
  async setAvailability(tenantId: string, id: string, isAvailable: boolean, actor: { userId: string; ip?: string }) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    if (driver.status === 'suspended' && isAvailable) {
      throw Errors.conflict('DRIVER_SUSPENDED', 'A suspended driver cannot be made available');
    }
    const updated = await this.prisma.driver.update({ where: { id }, data: { isAvailable } });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.availability_change', entity: 'driver', entityId: id,
      before: { isAvailable: driver.isAvailable }, after: { isAvailable }, ip: actor.ip,
    });
    return updated;
  }

  async updateLocation(tenantId: string, id: string, dto: UpdateDriverLocationDto) {
    await this.get(tenantId, id);
    const [location] = await this.prisma.$transaction([
      this.prisma.driverLocation.create({
        data: {
          tenantId,
          driverId: id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          heading: dto.heading,
          speed: dto.speed,
          accuracy: dto.accuracy,
        },
      }),
      this.prisma.driver.update({ where: { id }, data: { lastLocationAt: new Date() } }),
    ]);
    return location;
  }

  async latestLocations(tenantId: string) {
    // Latest ping per driver using a distinct-on style query.
    const drivers = await this.prisma.driver.findMany({
      where: { tenantId, status: { in: ['online', 'busy'] } },
      select: {
        id: true,
        fullName: true,
        status: true,
        phone: true,
        locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });
    return drivers.map((d) => ({
      driverId: d.id,
      fullName: d.fullName,
      status: d.status,
      phone: d.phone,
      location: d.locations[0] ?? null,
    }));
  }

  async reviewDocument(
    tenantId: string,
    driverId: string,
    documentId: string,
    dto: ReviewDocumentDto,
    actor: { userId: string; ip?: string },
  ) {
    const doc = await this.prisma.driverDocument.findFirst({ where: { id: documentId, driverId, tenantId } });
    if (!doc) throw Errors.notFound('driver_document');
    const updated = await this.prisma.driverDocument.update({
      where: { id: documentId },
      data: { status: dto.status, rejectReason: dto.rejectReason, reviewedBy: actor.userId, reviewedAt: new Date() },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.document_review', entity: 'driver_document',
      entityId: documentId, before: { status: doc.status }, after: { status: dto.status }, ip: actor.ip,
    });
    return updated;
  }

  async assignVehicle(tenantId: string, driverId: string, vehicleId: string, actor: { userId: string; ip?: string }) {
    await this.get(tenantId, driverId);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId } });
    if (!vehicle) throw Errors.notFound('vehicle');
    await this.prisma.driverVehicle.updateMany({ where: { driverId }, data: { isActive: false } });
    const link = await this.prisma.driverVehicle.upsert({
      where: { driverId_vehicleId: { driverId, vehicleId } },
      update: { isActive: true },
      create: { driverId, vehicleId, isActive: true },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.vehicle_assign', entity: 'driver', entityId: driverId, after: { vehicleId }, ip: actor.ip,
    });
    return link;
  }

  async unassignVehicle(tenantId: string, driverId: string, vehicleId: string, actor: { userId: string; ip?: string }) {
    await this.get(tenantId, driverId);
    const link = await this.prisma.driverVehicle.findFirst({ where: { driverId, vehicleId } });
    if (!link) throw Errors.notFound('driver_vehicle');
    await this.prisma.driverVehicle.update({
      where: { driverId_vehicleId: { driverId, vehicleId } },
      data: { isActive: false },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.vehicle_unassign', entity: 'driver', entityId: driverId,
      before: { vehicleId }, ip: actor.ip,
    });
    return this.get(tenantId, driverId);
  }
}
