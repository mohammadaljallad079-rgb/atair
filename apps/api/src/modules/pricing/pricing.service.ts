import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import {
  PriceQuote,
  PriceQuoteInput,
  PricingComponentType,
  PricingEngine,
  PricingRuleInput,
} from './pricing.engine';

export interface UpsertPricingRuleDto {
  name: string;
  description?: string;
  zoneId?: string;
  merchantId?: string;
  vehicleTypeId?: string;
  deliveryType?: string;
  priority?: number;
  currency?: string;
  isActive?: boolean;
  components: Array<{
    type: PricingComponentType;
    amount: number;
    minValue?: number;
    maxValue?: number;
    meta?: Record<string, any>;
  }>;
}

export interface QuoteDto extends PriceQuoteInput {
  zoneId?: string;
  merchantId?: string;
  vehicleTypeId?: string;
  deliveryType?: string;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listRules(tenantId: string, q: PaginationQueryDto) {
    const where = {
      tenantId,
      ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.pricingRule.findMany({
        where,
        include: { components: true, zone: true, merchant: true },
        orderBy: { priority: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.pricingRule.count({ where }),
    ]);
    return { items, total };
  }

  async createRule(tenantId: string, dto: UpsertPricingRuleDto, actor: { userId: string; ip?: string }) {
    const rule = await this.prisma.pricingRule.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        zoneId: dto.zoneId,
        merchantId: dto.merchantId,
        vehicleTypeId: dto.vehicleTypeId,
        deliveryType: dto.deliveryType as any,
        priority: dto.priority ?? 0,
        currency: dto.currency ?? 'SAR',
        isActive: dto.isActive ?? true,
        components: {
          create: dto.components.map((c) => ({
            type: c.type,
            amount: c.amount,
            minValue: c.minValue,
            maxValue: c.maxValue,
            meta: c.meta,
          })),
        },
      },
      include: { components: true },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'pricing_rule.create', entity: 'pricing_rule', entityId: rule.id, after: rule, ip: actor.ip });
    return rule;
  }

  async updateRule(tenantId: string, id: string, dto: Partial<UpsertPricingRuleDto>, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.pricingRule.findFirst({ where: { id, tenantId }, include: { components: true } });
    if (!before) throw Errors.notFound('pricing_rule');

    const rule = await this.prisma.$transaction(async (tx) => {
      if (dto.components) {
        await tx.pricingComponent.deleteMany({ where: { pricingRuleId: id } });
      }
      return tx.pricingRule.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          zoneId: dto.zoneId,
          merchantId: dto.merchantId,
          vehicleTypeId: dto.vehicleTypeId,
          deliveryType: dto.deliveryType as any,
          priority: dto.priority,
          currency: dto.currency,
          isActive: dto.isActive,
          ...(dto.components
            ? {
                components: {
                  create: dto.components.map((c) => ({
                    type: c.type,
                    amount: c.amount,
                    minValue: c.minValue,
                    maxValue: c.maxValue,
                    meta: c.meta,
                  })),
                },
              }
            : {}),
        },
        include: { components: true },
      });
    });

    await this.audit.log({ tenantId, userId: actor.userId, action: 'pricing_rule.update', entity: 'pricing_rule', entityId: id, before, after: rule, ip: actor.ip });
    return rule;
  }

  /** Loads the most specific active rules matching the request context. */
  private async loadApplicableRules(tenantId: string, ctx: QuoteDto): Promise<PricingRuleInput[]> {
    const now = new Date();
    // A rule scoped to a zone/merchant/vehicle applies only when the request
    // carries that scope; otherwise only unscoped (null) rules apply. The
    // clauses are written out explicitly because Prisma treats a `field:
    // undefined` value inside an OR as "match nothing", which silently dropped
    // every rule when the scope was absent.
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        tenantId,
        isActive: true,
        AND: [
          ctx.zoneId
            ? { OR: [{ zoneId: null }, { zoneId: ctx.zoneId }] }
            : { zoneId: null },
          ctx.merchantId
            ? { OR: [{ merchantId: null }, { merchantId: ctx.merchantId }] }
            : { merchantId: null },
          ctx.vehicleTypeId
            ? { OR: [{ vehicleTypeId: null }, { vehicleTypeId: ctx.vehicleTypeId }] }
            : { vehicleTypeId: null },
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      },
      include: { components: true },
    });

    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      currency: r.currency,
      priority: r.priority,
      components: r.components.map((c) => ({
        type: c.type as PricingComponentType,
        amount: Number(c.amount),
        minValue: c.minValue != null ? Number(c.minValue) : null,
        maxValue: c.maxValue != null ? Number(c.maxValue) : null,
        meta: (c.meta as Record<string, any>) ?? null,
      })),
    }));
  }

  /** Server-side price calculation used by orders and the admin preview. */
  async quote(tenantId: string, dto: QuoteDto): Promise<PriceQuote> {
    const rules = await this.loadApplicableRules(tenantId, dto);
    const rule = PricingEngine.selectRule(rules);
    if (!rule) {
      // No rule matched (e.g. an out-of-zone request): never surface a silent
      // zero-fare quote. Callers must scope the request to a zone/merchant that
      // has pricing configured.
      throw Errors.conflict('PRICING_UNAVAILABLE', 'No pricing rule applies to this request');
    }
    return PricingEngine.quote(rule, dto);
  }
}
