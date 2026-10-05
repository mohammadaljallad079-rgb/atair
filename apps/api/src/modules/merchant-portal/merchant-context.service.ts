import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface MerchantContext {
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  merchantStatus: string;
  branchId: string | null;
  merchantRole: string | null;
  currency: string;
}

/**
 * Resolves the merchant a request operates as.
 *
 * The set of merchants a user may access comes exclusively from the signed
 * access token (`merchantIds`, resolved from MerchantUser at login) — never
 * from a client-supplied body/query field. An explicit `requestedMerchantId`
 * is only honoured if it is one of the caller's own merchants, which makes
 * cross-merchant IDOR impossible even for multi-merchant users.
 */
@Injectable()
export class MerchantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: AuthUser, requestedMerchantId?: string): Promise<MerchantContext> {
    const allowed = user.merchantIds ?? [];
    if (allowed.length === 0) {
      throw Errors.forbidden('No merchant account is linked to this user');
    }
    if (requestedMerchantId && !allowed.includes(requestedMerchantId)) {
      // Do not reveal whether the merchant exists for someone else.
      throw Errors.forbidden('You do not have access to this merchant');
    }
    const merchantId = requestedMerchantId ?? allowed[0];

    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantId, tenantId: user.tenantId },
      select: { id: true, name: true, slug: true, status: true, settings: true },
    });
    if (!merchant) throw Errors.notFound('merchant');
    if (merchant.status !== 'active') {
      throw Errors.forbidden('Merchant account is not active');
    }

    const link = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId, userId: user.userId } },
      select: { role: true, branchId: true },
    });

    const settings = (merchant.settings as Record<string, unknown> | null) ?? {};
    const currency = typeof settings.currency === 'string' ? (settings.currency as string) : 'SAR';

    return {
      merchantId: merchant.id,
      merchantName: merchant.name,
      merchantSlug: merchant.slug,
      merchantStatus: merchant.status,
      branchId: link?.branchId ?? null,
      merchantRole: link?.role ?? null,
      currency,
    };
  }
}
