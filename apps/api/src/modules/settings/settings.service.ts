import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.systemSetting.findMany({ where: { tenantId } });
  }

  async set(tenantId: string, key: string, value: unknown, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.systemSetting.findFirst({ where: { tenantId, key } });
    const setting = await this.prisma.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value: value as any },
      create: { tenantId, key, value: value as any },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'settings.set', entity: 'system_setting',
      entityId: setting.id, before: before?.value, after: value, ip: actor.ip,
    });
    return setting;
  }
}
