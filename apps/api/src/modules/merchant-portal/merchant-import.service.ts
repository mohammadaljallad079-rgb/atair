import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { MerchantContext } from './merchant-context.service';
import { ImportOrderRowDto, ImportOrdersDto } from './dto/merchant-portal.dto';

export interface ImportRowResult {
  index: number;
  clientRef: string | null;
  valid: boolean;
  errors: string[];
  orderNumber?: string;
  orderId?: string;
}

export interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created: number;
  duplicateRefs: string[];
  rows: ImportRowResult[];
}

/**
 * CSV bulk order import. The API receives already-parsed rows (the portal parses
 * the CSV in the browser) and validates each row server-side before any insert.
 *
 * Guarantees:
 *  - a preview (`confirm=false`) never writes;
 *  - invalid rows are reported per-row and never inserted;
 *  - duplicate `clientRef`s within the payload are rejected;
 *  - the merchant is taken from the token, never from the payload.
 */
@Injectable()
export class MerchantImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  private validateRow(row: ImportOrderRowDto): string[] {
    const errors: string[] = [];
    if (!row.pickupAddress?.trim()) errors.push('pickupAddress is required');
    if (!row.dropoffAddress?.trim()) errors.push('dropoffAddress is required');
    if (row.codAmount != null && row.codAmount < 0) errors.push('codAmount must be >= 0');
    if (row.weightKg != null && row.weightKg < 0) errors.push('weightKg must be >= 0');
    return errors;
  }

  async import(ctx: MerchantContext, dto: ImportOrdersDto, actor: { userId: string; ip?: string }): Promise<ImportResult> {
    const tenant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { tenantId: true },
    });
    if (!tenant) return { dryRun: true, totalRows: 0, validRows: 0, invalidRows: 0, created: 0, duplicateRefs: [], rows: [] };

    const confirm = dto.confirm !== false;

    if (dto.merchantBranchId) {
      const branch = await this.prisma.merchantBranch.findFirst({
        where: { id: dto.merchantBranchId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      // A bad branch invalidates the whole import (it is a shared parameter).
      if (!branch) {
        return {
          dryRun: !confirm,
          totalRows: dto.rows.length,
          validRows: 0,
          invalidRows: dto.rows.length,
          created: 0,
          duplicateRefs: [],
          rows: dto.rows.map((r, i) => ({ index: i, clientRef: r.clientRef ?? null, valid: false, errors: ['merchantBranchId does not belong to this merchant'] })),
        };
      }
    }

    const seen = new Map<string, number>();
    const results: ImportRowResult[] = dto.rows.map((row, index) => {
      const errors = this.validateRow(row);
      if (row.clientRef) {
        if (seen.has(row.clientRef)) {
          errors.push(`duplicate clientRef "${row.clientRef}"`);
        } else {
          seen.set(row.clientRef, index);
        }
      }
      return { index, clientRef: row.clientRef ?? null, valid: errors.length === 0, errors };
    });

    const duplicateRefs = Array.from(seen.entries())
      .filter(([ref]) => results.some((r) => r.clientRef === ref && !r.valid && r.errors.some((e) => e.includes('duplicate'))))
      .map(([ref]) => ref);

    let created = 0;
    if (confirm) {
      for (const result of results) {
        if (!result.valid) continue;
        const row = dto.rows[result.index];
        const order = await this.orders.create(
          tenant.tenantId,
          {
            merchantId: ctx.merchantId,
            merchantBranchId: dto.merchantBranchId,
            pickupAddress: row.pickupAddress,
            dropoffAddress: row.dropoffAddress,
            paymentMethod: row.codAmount && row.codAmount > 0 ? 'cod' : 'cash',
            codAmount: row.codAmount,
            notes: row.notes,
            items: row.packageDescription
              ? [{ name: row.packageDescription, quantity: 1, weightKg: row.weightKg }]
              : row.weightKg != null
                ? [{ name: 'Package', quantity: 1, weightKg: row.weightKg }]
                : undefined,
            addresses: [
              { type: 'pickup', address: row.pickupAddress },
              { type: 'dropoff', address: row.dropoffAddress, contactName: row.recipientName, contactPhone: row.recipientPhone },
            ],
          },
          actor,
        );
        result.orderNumber = order.orderNumber;
        result.orderId = order.id;
        created++;
      }
      await this.audit.log({
        tenantId: tenant.tenantId, userId: actor.userId, action: 'merchant.orders_import',
        entity: 'order', after: { created, totalRows: dto.rows.length }, ip: actor.ip,
      });
    }

    return {
      dryRun: !confirm,
      totalRows: dto.rows.length,
      validRows: results.filter((r) => r.valid).length,
      invalidRows: results.filter((r) => !r.valid).length,
      created,
      duplicateRefs,
      rows: results,
    };
  }

  /** Template definition for the downloadable CSV import file. */
  template(): { columns: string[]; sample: string } {
    const columns = [
      'pickupAddress',
      'dropoffAddress',
      'recipientName',
      'recipientPhone',
      'packageDescription',
      'weightKg',
      'codAmount',
      'notes',
      'clientRef',
    ];
    const sample = [
      'مستودع الرياض، طريق الملك فهد',
      'حي العليا، شارع التخصصي',
      'محمد العتيبي',
      '+966500000010',
      'طرد إلكترونيات',
      '2.5',
      '250',
      'يُسلّم بعد الاتصال',
      'SHOP-1001',
    ].join(',');
    return { columns, sample };
  }
}
