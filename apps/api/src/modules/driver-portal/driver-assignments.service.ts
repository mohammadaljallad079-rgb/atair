import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DriverContext } from './driver-context.service';

/**
 * Driver assignment actions: a driver can view their offered/assigned orders
 * and accept or reject an offer. Every mutation is tenant- and driver-scoped:
 * the driver id always comes from the resolved context, never from the client.
 */
@Injectable()
export class DriverAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Offers and active assignments for the signed-in driver. */
  async list(ctx: DriverContext) {
    const assignments = await this.prisma.orderAssignment.findMany({
      where: { tenantId: ctx.tenantId, driverId: ctx.driverId, status: { in: ['offered', 'accepted'] } },
      include: {
        order: {
          select: {
            id: true, orderNumber: true, status: true, total: true, currency: true,
            pickupAddress: true, dropoffAddress: true, distanceKm: true, createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return assignments;
  }

  /**
   * Accepts an offered assignment: marks the offer accepted, assigns the order
   * to the driver, moves the order to `assigned`, closes the other offers and
   * notifies the customer. Idempotent-safe: only an `offered` row can be
   * accepted by its own driver.
   */
  async accept(ctx: DriverContext, assignmentId: string) {
    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { id: assignmentId, tenantId: ctx.tenantId, driverId: ctx.driverId },
      include: { order: true },
    });
    if (!assignment) throw Errors.notFound('assignment');
    if (assignment.status !== 'offered') {
      throw Errors.conflict('ASSIGNMENT_NOT_OFFERED', 'This assignment is no longer open');
    }
    if (assignment.expiresAt && assignment.expiresAt < new Date()) {
      throw Errors.conflict('ASSIGNMENT_EXPIRED', 'This offer has expired');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.orderAssignment.update({
        where: { id: assignmentId },
        data: { status: 'accepted', respondedAt: new Date() },
      });
      await tx.orderAssignment.updateMany({
        where: { orderId: assignment.orderId, id: { not: assignmentId }, status: 'offered' },
        data: { status: 'cancelled' },
      });
      await tx.driver.update({
        where: { id: ctx.driverId },
        data: { status: 'busy', isAvailable: false },
      });
      const order = await tx.order.update({
        where: { id: assignment.orderId },
        data: { driverId: ctx.driverId, status: 'assigned', assignedAt: new Date() },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: assignment.orderId,
          fromStatus: assignment.order.status as any,
          toStatus: 'assigned',
          reason: 'driver accepted assignment',
        },
      });
      return order;
    });

    await this.notifications.emit(ctx.tenantId, 'order.assigned', {
      orderId: assignment.orderId,
      orderNumber: assignment.order.orderNumber,
      customerId: assignment.order.customerId,
      driverId: ctx.driverId,
      data: { driverName: ctx.fullName },
    });
    await this.audit.log({
      tenantId: ctx.tenantId, action: 'assignment.accept', entity: 'order_assignment', entityId: assignmentId,
      after: { orderId: assignment.orderId, driverId: ctx.driverId }, userId: null,
    });
    return updated;
  }

  /** Rejects an offered assignment; the order returns to the dispatch pool. */
  async reject(ctx: DriverContext, assignmentId: string, reason?: string) {
    const assignment = await this.prisma.orderAssignment.findFirst({
      where: { id: assignmentId, tenantId: ctx.tenantId, driverId: ctx.driverId },
    });
    if (!assignment) throw Errors.notFound('assignment');
    if (assignment.status !== 'offered') {
      throw Errors.conflict('ASSIGNMENT_NOT_OFFERED', 'This assignment is no longer open');
    }
    const updated = await this.prisma.orderAssignment.update({
      where: { id: assignmentId },
      data: { status: 'rejected', respondedAt: new Date() },
    });
    await this.audit.log({
      tenantId: ctx.tenantId, action: 'assignment.reject', entity: 'order_assignment', entityId: assignmentId,
      after: { reason: reason ?? null }, userId: null,
    });
    return updated;
  }
}
