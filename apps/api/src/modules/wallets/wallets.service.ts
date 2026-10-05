import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';

export interface WalletAdjustDto {
  type: 'credit' | 'debit' | 'payout' | 'adjustment';
  amount: number;
  description?: string;
  reference?: string;
}

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.driverWallet.findMany({
      where: { tenantId },
      include: { driver: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(tenantId: string, driverId: string) {
    const wallet = await this.prisma.driverWallet.findFirst({
      where: { tenantId, driverId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!wallet) throw Errors.notFound('wallet');
    return wallet;
  }

  /** Applies a wallet movement atomically and records the resulting balance. */
  async adjust(tenantId: string, driverId: string, dto: WalletAdjustDto, actor: { userId: string; ip?: string }) {
    const wallet = await this.prisma.driverWallet.findFirst({ where: { tenantId, driverId } });
    if (!wallet) throw Errors.notFound('wallet');
    if (dto.amount <= 0) throw Errors.validation('Amount must be positive');

    const delta = dto.type === 'credit' || dto.type === 'adjustment' ? dto.amount : -dto.amount;
    const balanceAfter = Number(wallet.balance) + delta;
    if (balanceAfter < 0) throw Errors.conflict('INSUFFICIENT_BALANCE', 'Wallet balance cannot go negative');

    const [updated] = await this.prisma.$transaction([
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } }),
      this.prisma.walletTransaction.create({
        data: {
          tenantId, walletId: wallet.id, type: dto.type, amount: dto.amount,
          balanceAfter, reference: dto.reference, description: dto.description,
        },
      }),
    ]);

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'wallet.adjust', entity: 'driver_wallet', entityId: wallet.id,
      after: { type: dto.type, amount: dto.amount, balanceAfter }, ip: actor.ip,
    });
    return updated;
  }

  /**
   * Credits a driver's wallet when an order is settled. Idempotent per order:
   * a repeated settlement for the same order is a no-op, so retries can never
   * double-credit. A driver without a wallet yet gets one created on demand.
   */
  async creditForOrder(
    tenantId: string,
    driverId: string,
    amount: number,
    reference: string,
    description?: string,
  ) {
    if (amount <= 0) return null;

    const existing = await this.prisma.walletTransaction.findFirst({
      where: { tenantId, type: 'credit', reference },
    });
    if (existing) return null;

    const wallet = await this.prisma.driverWallet.upsert({
      where: { driverId },
      update: {},
      create: { tenantId, driverId, currency: 'SAR' },
    });

    const balanceAfter = Number(wallet.balance) + amount;
    const [, tx] = await this.prisma.$transaction([
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } }),
      this.prisma.walletTransaction.create({
        data: { tenantId, walletId: wallet.id, type: 'credit', amount, balanceAfter, reference, description },
      }),
    ]);
    return tx;
  }
}
