import { Module } from '@nestjs/common';
import { MerchantPortalController } from './merchant-portal.controller';
import { MerchantContextService } from './merchant-context.service';
import { MerchantOrdersService } from './merchant-orders.service';
import { MerchantReportsService } from './merchant-reports.service';
import { MerchantFinanceService } from './merchant-finance.service';
import { MerchantCustomersService } from './merchant-customers.service';
import { MerchantBranchesService } from './merchant-branches.service';
import { MerchantTeamService } from './merchant-team.service';
import { MerchantSupportService } from './merchant-support.service';
import { MerchantAccountService } from './merchant-account.service';
import { MerchantImportService } from './merchant-import.service';
import { MerchantExportService } from './merchant-export.service';

import { OrdersModule } from '../orders/orders.module';
import { PricingModule } from '../pricing/pricing.module';
import { TrackingModule } from '../tracking/tracking.module';
import { ZonesModule } from '../zones/zones.module';

/**
 * Merchant / Business Portal API. Every service in this module scopes data by
 * the merchant resolved from the signed token — never from client input — and
 * reuses the existing order engine, pricing engine, dispatch, payments, RBAC,
 * audit and support modules rather than reimplementing them.
 */
@Module({
  imports: [OrdersModule, PricingModule, TrackingModule, ZonesModule],
  controllers: [MerchantPortalController],
  providers: [
    MerchantContextService,
    MerchantOrdersService,
    MerchantReportsService,
    MerchantFinanceService,
    MerchantCustomersService,
    MerchantBranchesService,
    MerchantTeamService,
    MerchantSupportService,
    MerchantAccountService,
    MerchantImportService,
    MerchantExportService,
  ],
  exports: [MerchantContextService],
})
export class MerchantPortalModule {}
