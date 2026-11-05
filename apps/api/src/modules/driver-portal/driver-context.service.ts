import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface DriverContext {
  driverId: string;
  tenantId: string;
  fullName: string;
  phone: string;
  status: string;
  approvalStatus: string;
}

/**
 * Resolves the Driver row behind an authenticated user.
 *
 * The link is `Driver.userId === token.sub` (both set server-side when the
 * account is created/approved). A client can never supply a driver id, so a
 * driver can only ever act on their own assignments.
 */
@Injectable()
export class DriverContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: AuthUser): Promise<DriverContext> {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: user.userId, tenantId: user.tenantId },
      select: { id: true, tenantId: true, fullName: true, phone: true, status: true, approvalStatus: true },
    });
    if (!driver) throw Errors.forbidden('No driver profile is linked to this account');
    if (driver.approvalStatus !== 'approved') {
      throw Errors.forbidden('Driver account is not approved');
    }
    return {
      driverId: driver.id,
      tenantId: driver.tenantId,
      fullName: driver.fullName,
      phone: driver.phone,
      status: driver.status,
      approvalStatus: driver.approvalStatus,
    };
  }
}
