import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { pointInPolygon } from '../../common/utils/geo';

export interface CreateZoneDto {
  name: string;
  code?: string;
  polygon?: number[][];
  centerLat?: number;
  centerLng?: number;
  isActive?: boolean;
}

@Injectable()
export class ZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = {
      tenantId,
      ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceZone.findMany({ where, orderBy: { name: 'asc' }, skip: q.skip, take: q.take }),
      this.prisma.serviceZone.count({ where }),
    ]);
    return { items, total };
  }

  async create(tenantId: string, dto: CreateZoneDto, actor: { userId: string; ip?: string }) {
    const zone = await this.prisma.serviceZone.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        polygon: dto.polygon as any,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'zone.create', entity: 'service_zone', entityId: zone.id, after: zone, ip: actor.ip });
    return zone;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateZoneDto>, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.serviceZone.findFirst({ where: { id, tenantId } });
    if (!before) throw Errors.notFound('zone');
    // Explicit field pick instead of spreading the request body into Prisma.
    const zone = await this.prisma.serviceZone.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        polygon: dto.polygon as any,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        isActive: dto.isActive,
      },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'zone.update', entity: 'service_zone', entityId: id, before, after: zone, ip: actor.ip });
    return zone;
  }

  /** Resolves the service zone containing a coordinate, if any. */
  async resolveZone(tenantId: string, lat: number, lng: number) {
    const zones = await this.prisma.serviceZone.findMany({ where: { tenantId, isActive: true } });
    for (const zone of zones) {
      const polygon = zone.polygon as unknown as number[][] | null;
      if (Array.isArray(polygon) && polygon.length >= 3 && pointInPolygon(lng, lat, polygon)) {
        return zone;
      }
    }
    return null;
  }
}
