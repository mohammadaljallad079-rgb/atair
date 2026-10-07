import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { WalletAdjustDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = {
      tenantId,
      ...(q.search
        ? { driver: { fullName: { contains: q.search, mode: 'insensitive' as const } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.driverWallet.findMany({
        where,
        include: { driver: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.driverWallet.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, driverId: string, q?: PaginationQueryDto) {
    const wallet = await this.prisma.driverWallet.findFirst({ where: { tenantId, driverId } });
    if (!wallet) throw Errors.notFound('wallet');
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { tenantId, walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: q?.skip ?? 0,
        take: q?.take ?? 50,
      }),
      this.prisma.walletTransaction.count({ where: { tenantId, walletId: wallet.id } }),
    ]);
    return { ...wallet, transactions, transactionTotal: total };
  }

  /** Applies a wallet movement atomically and records the resulting balance. */
  async adjust(tenantId: string, driverId: string, dto: WalletAdjustDto, actor: { userId: string; ip?: string }) {
    const wallet = await this.prisma.driverWallet.findFirst({ where: { tenantId, driverId } });
    if (!wallet) throw Errors.notFound('wallet');
    if (dto.amount <= 0) throw Errors.validation('Amount must be positive');
    if (!dto.reason || !dto.reason.trim()) {
      throw Errors.validation('A reason is required for wallet adjustments');
    }

    const delta = dto.type === 'credit' || dto.type === 'adjustment' ? dto.amount : -dto.amount;
    const balanceAfter = Number(wallet.balance) + delta;
    if (balanceAfter < 0) throw Errors.conflict('INSUFFICIENT_BALANCE', 'Wallet balance cannot go negative');

    const [updated] = await this.prisma.$transaction([
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } }),
      this.prisma.walletTransaction.create({
        data: {
          tenantId, walletId: wallet.id, type: dto.type, amount: dto.amount,
          balanceAfter, reference: dto.reference, description: dto.reason,
        },
      }),
    ]);

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'wallet.adjust', entity: 'driver_wallet', entityId: wallet.id,
      after: { type: dto.type, amount: dto.amount, balanceAfter, reason: dto.reason }, ip: actor.ip,
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
