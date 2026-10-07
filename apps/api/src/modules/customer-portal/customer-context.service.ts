import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface CustomerContext {
  customerId: string;
  tenantId: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
}

/**
 * Resolves the Customer row behind an authenticated user.
 *
 * The link is `Customer.userId === token.sub` (both resolved server-side at
 * registration). A client can never supply a customer id: every service in this
 * module derives the owner from this context, which makes cross-customer IDOR
 * impossible.
 */
@Injectable()
export class CustomerContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: AuthUser): Promise<CustomerContext> {
    const customer = await this.prisma.customer.findFirst({
      where: { userId: user.userId, tenantId: user.tenantId },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        phone: true,
        email: true,
        status: true,
      },
    });
    if (!customer) {
      throw Errors.forbidden('No customer profile is linked to this account');
    }
    if (customer.status === 'blocked') {
      throw Errors.forbidden('Customer account is blocked');
    }
    return {
      customerId: customer.id,
      tenantId: customer.tenantId,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
    };
  }
}
