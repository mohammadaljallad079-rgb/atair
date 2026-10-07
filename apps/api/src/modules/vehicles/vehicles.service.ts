import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export interface CreateVehicleDto {
  plateNumber: string;
  vehicleTypeId?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
}

export interface VehicleQueryDto extends PaginationQueryDto {
  status?: string;
}

const VEHICLE_STATUSES = ['active', 'inactive', 'maintenance'] as const;
type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listTypes() {
    return this.prisma.vehicleType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async list(tenantId: string, q: VehicleQueryDto) {
    const where = {
      tenantId,
      ...(q.status ? { status: q.status as VehicleStatus } : {}),
      ...(q.search ? { plateNumber: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: {
          vehicleType: true,
          drivers: { where: { isActive: true }, include: { driver: { select: { id: true, fullName: true, phone: true, status: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
      include: {
        vehicleType: true,
        drivers: { include: { driver: { select: { id: true, fullName: true, phone: true, status: true, verificationStatus: true } } } },
      },
    });
    if (!vehicle) throw Errors.notFound('vehicle');
    return vehicle;
  }

  /** Sets the operational status of a vehicle. Always audited. */
  async setStatus(tenantId: string, id: string, status: VehicleStatus, actor: { userId: string; ip?: string }) {
    if (!VEHICLE_STATUSES.includes(status)) throw Errors.validation('Invalid vehicle status');
    const before = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!before) throw Errors.notFound('vehicle');
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: { status } });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'vehicle.status_change', entity: 'vehicle', entityId: id,
      before: { status: before.status }, after: { status }, ip: actor.ip,
    });
    return vehicle;
  }

  /**
   * Assigns a driver to a vehicle. A vehicle carries at most one active driver:
   * any prior active link is deactivated and any prior vehicle the driver was
   * linked to is also deactivated, so assignments never conflict.
   */
  async assignDriver(tenantId: string, vehicleId: string, driverId: string, actor: { userId: string; ip?: string }) {
    const [vehicle, driver] = await Promise.all([
      this.prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId } }),
      this.prisma.driver.findFirst({ where: { id: driverId, tenantId } }),
    ]);
    if (!vehicle) throw Errors.notFound('vehicle');
    if (!driver) throw Errors.notFound('driver');
    if (driver.status === 'suspended') throw Errors.conflict('DRIVER_SUSPENDED', 'Cannot assign a suspended driver');

    await this.prisma.$transaction([
      this.prisma.driverVehicle.updateMany({ where: { vehicleId }, data: { isActive: false } }),
      this.prisma.driverVehicle.updateMany({ where: { driverId }, data: { isActive: false } }),
      this.prisma.driverVehicle.upsert({
        where: { driverId_vehicleId: { driverId, vehicleId } },
        update: { isActive: true, assignedAt: new Date() },
        create: { driverId, vehicleId, isActive: true },
      }),
    ]);

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'vehicle.assign_driver', entity: 'vehicle', entityId: vehicleId,
      after: { driverId }, ip: actor.ip,
    });
    return this.get(tenantId, vehicleId);
  }

  async unassignDriver(tenantId: string, vehicleId: string, driverId: string, actor: { userId: string; ip?: string }) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId } });
    if (!vehicle) throw Errors.notFound('vehicle');
    const link = await this.prisma.driverVehicle.findFirst({ where: { vehicleId, driverId } });
    if (!link) throw Errors.notFound('vehicle_assignment');
    await this.prisma.driverVehicle.update({ where: { driverId_vehicleId: { driverId, vehicleId } }, data: { isActive: false } });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'vehicle.unassign_driver', entity: 'vehicle', entityId: vehicleId,
      before: { driverId }, ip: actor.ip,
    });
    return this.get(tenantId, vehicleId);
  }

  async create(tenantId: string, dto: CreateVehicleDto, actor: { userId: string; ip?: string }) {
    const existing = await this.prisma.vehicle.findFirst({ where: { tenantId, plateNumber: dto.plateNumber } });
    if (existing) throw Errors.conflict('VEHICLE_EXISTS', 'A vehicle with this plate already exists');
    const vehicle = await this.prisma.vehicle.create({ data: { tenantId, ...dto } });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'vehicle.create', entity: 'vehicle', entityId: vehicle.id, after: vehicle, ip: actor.ip });
    return vehicle;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateVehicleDto>, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.vehicle.findFirst({ where: { id, tenantId } });
    if (!before) throw Errors.notFound('vehicle');
    // Explicit field pick: never spread the request body straight into Prisma,
    // so an unexpected key can never reach a non-updatable column.
    const data = {
      plateNumber: dto.plateNumber,
      vehicleTypeId: dto.vehicleTypeId,
      make: dto.make,
      model: dto.model,
      year: dto.year,
      color: dto.color,
    };
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'vehicle.update', entity: 'vehicle', entityId: id, before, after: vehicle, ip: actor.ip });
    return vehicle;
  }
}
