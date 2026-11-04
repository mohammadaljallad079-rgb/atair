import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { AccountsService } from '../accounts/accounts.service';
import {
  CreateDriverDto,
  DriverDocumentInputDto,
  DriverQueryDto,
  RejectDriverDto,
  ReviewDocumentDto,
  UpdateDriverDto,
  UpdateDriverLocationDto,
} from './dto/driver.dto';

export interface DriverActor {
  userId: string;
  ip?: string;
}

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounts: AccountsService,
  ) {}

  async list(tenantId: string, q: DriverQueryDto) {
    const where = {
      tenantId,
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus as any } : {}),
      ...(q.approvalStatus ? { approvalStatus: q.approvalStatus as any } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search, mode: 'insensitive' as const } },
              { phone: { contains: q.search } },
              { email: { contains: q.search, mode: 'insensitive' as const } },
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
        user: { select: { id: true, email: true, username: true, status: true } },
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

  /**
   * Creates a driver, optionally with a login account, an initial vehicle and
   * identity/licence documents — all in one transaction so a partial
   * registration can never be persisted. Duplicate phone/national-id/account
   * are rejected up front.
   */
  async create(
    tenantId: string,
    dto: CreateDriverDto,
    actor: DriverActor,
    opts: { source?: 'admin' | 'website' | 'app'; approvalStatus?: 'pending' | 'approved' } = {},
  ) {
    const existing = await this.prisma.driver.findFirst({ where: { tenantId, phone: dto.phone } });
    if (existing) throw Errors.conflict('DRIVER_EXISTS', 'A driver with this phone already exists');
    if (dto.nationalId) {
      const dupId = await this.prisma.driver.findFirst({ where: { tenantId, nationalId: dto.nationalId } });
      if (dupId) throw Errors.conflict('DRIVER_EXISTS', 'A driver with this national ID already exists');
    }

    const approvalStatus = opts.approvalStatus ?? dto.approvalStatus ?? 'pending';
    const source = opts.source ?? 'admin';

    return this.prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (dto.account?.password) {
        const account = await this.accounts.provision({
          tenantId,
          fullName: dto.fullName,
          email: dto.account.email ?? dto.email,
          phone: dto.phone,
          username: dto.account.username,
          password: dto.account.password,
          roleSlug: 'driver',
          status: approvalStatus === 'approved' ? 'active' : 'invited',
          tx,
        });
        userId = account.id;
      }

      const driver = await tx.driver.create({
        data: {
          tenantId,
          userId,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          nationalId: dto.nationalId,
          nationalIdExpiry: dto.nationalIdExpiry ? new Date(dto.nationalIdExpiry) : null,
          licenseNumber: dto.licenseNumber,
          licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
          approvalStatus,
          approvedAt: approvalStatus === 'approved' ? new Date() : null,
          source,
        },
      });

      await tx.driverWallet.create({ data: { tenantId, driverId: driver.id } });

      if (dto.documents?.length) {
        await tx.driverDocument.createMany({
          data: dto.documents.map((doc) => this.toDocumentRow(tenantId, driver.id, doc)),
        });
      }

      if (dto.vehiclePlate) {
        const vehicle = await tx.vehicle.create({
          data: {
            tenantId,
            plateNumber: dto.vehiclePlate,
            vehicleTypeId: dto.vehicleTypeId ?? null,
            make: dto.vehicleMake,
            model: dto.vehicleModel,
          },
        });
        await tx.driverVehicle.create({ data: { driverId: driver.id, vehicleId: vehicle.id, isActive: true } });
      }

      await this.audit.log({
        tenantId, userId: actor.userId, action: 'driver.create', entity: 'driver', entityId: driver.id,
        after: { ...driver, hasAccount: Boolean(userId), source }, ip: actor.ip,
      });
      return driver;
    });
  }

  private toDocumentRow(tenantId: string, driverId: string, doc: DriverDocumentInputDto) {
    return {
      tenantId,
      driverId,
      type: doc.type as any,
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      number: doc.number,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto, actor: DriverActor) {
    const before = await this.get(tenantId, id);
    // Explicit field pick — never spread the request body into Prisma.
    const driver = await this.prisma.driver.update({
      where: { id: before.id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        nationalId: dto.nationalId,
        nationalIdExpiry: dto.nationalIdExpiry ? new Date(dto.nationalIdExpiry) : undefined,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
        status: dto.status as any,
        verificationStatus: dto.verificationStatus as any,
        isAvailable: dto.isAvailable,
      },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.update', entity: 'driver', entityId: id, before, after: driver, ip: actor.ip,
    });
    return driver;
  }

  /** Approves a pending driver: flips approval + verification and activates the login. */
  async approve(tenantId: string, id: string, actor: DriverActor) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    if (driver.approvalStatus === 'approved') {
      throw Errors.conflict('DRIVER_ALREADY_APPROVED', 'Driver is already approved');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.driver.update({
        where: { id },
        data: {
          approvalStatus: 'approved',
          verificationStatus: 'verified',
          approvedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          rejectionReason: null,
        },
      });
      if (driver.userId) {
        await tx.user.update({ where: { id: driver.userId }, data: { status: 'active' } });
      }
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.approve', entity: 'driver', entityId: id,
      before: { approvalStatus: driver.approvalStatus }, after: { approvalStatus: 'approved' }, ip: actor.ip,
    });
    return updated;
  }

  /** Rejects a pending driver with an optional reason; login stays blocked. */
  async reject(tenantId: string, id: string, dto: RejectDriverDto, actor: DriverActor) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.driver.update({
        where: { id },
        data: {
          approvalStatus: 'rejected',
          verificationStatus: 'rejected',
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          rejectionReason: dto.reason ?? null,
        },
      });
      if (driver.userId) {
        await tx.user.update({ where: { id: driver.userId }, data: { status: 'suspended' } });
        await tx.session.updateMany({ where: { userId: driver.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.reject', entity: 'driver', entityId: id,
      before: { approvalStatus: driver.approvalStatus }, after: { approvalStatus: 'rejected', reason: dto.reason }, ip: actor.ip,
    });
    return updated;
  }

  /** Changing driver status is validated server-side and always logged. */
  async setStatus(
    tenantId: string,
    id: string,
    status: 'offline' | 'online' | 'busy' | 'paused' | 'suspended',
    reason: string | undefined,
    actor: DriverActor,
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

  async suspend(tenantId: string, id: string, reason: string | undefined, actor: DriverActor) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.driver.update({
        where: { id },
        data: {
          status: 'suspended',
          isAvailable: false,
          suspendedReason: reason ?? null,
          approvalStatus: driver.approvalStatus === 'approved' ? 'suspended' : driver.approvalStatus,
        },
      });
      await tx.driverStatusLog.create({
        data: { tenantId, driverId: id, fromStatus: driver.status, toStatus: 'suspended', reason },
      });
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'driver.suspend', entity: 'driver', entityId: id,
      before: { status: driver.status }, after: { status: 'suspended', reason }, ip: actor.ip,
    });
    return updated;
  }

  /**
   * Lifts a suspension and returns the driver to offline. Suspension is a
   * reversible operational action (never a hard delete); reactivation is
   * audited like any other status change.
   */
  async unsuspend(tenantId: string, id: string, actor: DriverActor) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    if (driver.status !== 'suspended') {
      throw Errors.conflict('DRIVER_NOT_SUSPENDED', 'Driver is not currently suspended');
    }
    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        status: 'offline',
        isAvailable: false,
        suspendedReason: null,
        approvalStatus: driver.approvalStatus === 'suspended' ? 'approved' : driver.approvalStatus,
      },
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
  async setAvailability(tenantId: string, id: string, isAvailable: boolean, actor: DriverActor) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    if (driver.status === 'suspended' && isAvailable) {
      throw Errors.conflict('DRIVER_SUSPENDED', 'A suspended driver cannot be made available');
    }
    if (driver.approvalStatus !== 'approved' && isAvailable) {
      throw Errors.conflict('DRIVER_NOT_APPROVED', 'An unapproved driver cannot be made available');
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
    actor: DriverActor,
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

  async assignVehicle(tenantId: string, driverId: string, vehicleId: string, actor: DriverActor) {
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

  async unassignVehicle(tenantId: string, driverId: string, vehicleId: string, actor: DriverActor) {
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
