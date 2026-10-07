import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditQueryDto, SecurityEventQueryDto } from './dto/audit.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@atair/db';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';

/** Builds a `createdAt` range clause from optional ISO bounds. */
function dateRange(from?: string, to?: string) {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  };
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('activity')
  @RequirePermissions([PERMISSIONS.audit_view])
  async activity(@CurrentUser() user: AuthUser, @Query() q: AuditQueryDto) {
    const where = {
      tenantId: user.isPlatformAdmin ? undefined : user.tenantId,
      ...(q.userId ? { userId: q.userId } : {}),
      ...dateRange(q.from, q.to),
      ...(q.search
        ? {
            OR: [
              { action: { contains: q.search, mode: 'insensitive' as const } },
              { entity: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('api-logs')
  @RequirePermissions([PERMISSIONS.audit_view])
  async apiLogs(@CurrentUser() user: AuthUser, @Query() q: AuditQueryDto) {
    const where = {
      tenantId: user.isPlatformAdmin ? undefined : user.tenantId,
      ...dateRange(q.from, q.to),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.apiLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.apiLog.count({ where }),
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('security-events')
  @RequirePermissions([PERMISSIONS.audit_view])
  async securityEvents(@CurrentUser() user: AuthUser, @Query() q: SecurityEventQueryDto) {
    const where = {
      tenantId: user.isPlatformAdmin ? undefined : user.tenantId,
      ...(q.severity ? { severity: q.severity as any } : {}),
      ...dateRange(q.from, q.to),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.securityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.securityEvent.count({ where }),
    ]);
    return paginated(items, total, q.page, q.pageSize);
  }
}
