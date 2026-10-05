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

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listTypes() {
    return this.prisma.vehicleType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = {
      tenantId,
      ...(q.search ? { plateNumber: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({ where, include: { vehicleType: true }, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { items, total };
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
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: dto });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'vehicle.update', entity: 'vehicle', entityId: id, before, after: vehicle, ip: actor.ip });
    return vehicle;
  }
}
