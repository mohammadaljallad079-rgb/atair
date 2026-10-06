import { Module } from '@nestjs/common';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerContextService } from './customer-context.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerOrdersService } from './customer-orders.service';
import { CustomerAccountService } from './customer-account.service';
import { CustomerSupportService } from './customer-support.service';

import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PricingModule } from '../pricing/pricing.module';
import { TrackingModule } from '../tracking/tracking.module';
import { ZonesModule } from '../zones/zones.module';

/**
 * Customer Application API.
 *
 * Every service resolves the acting customer from the signed token and scopes
 * its queries by `customerId`, reusing the existing order engine, pricing
 * engine, tracking, notifications, RBAC and support modules rather than
 * reimplementing them. CustomerBoundaryGuard (registered globally) confines
 * customer-only principals to this surface.
 */
@Module({
  imports: [AuthModule, OrdersModule, PricingModule, TrackingModule, ZonesModule],
  controllers: [CustomerPortalController],
  providers: [
    CustomerContextService,
    CustomerAuthService,
    CustomerOrdersService,
    CustomerAccountService,
    CustomerSupportService,
  ],
})
export class CustomerPortalModule {}
