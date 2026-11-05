import { Module } from '@nestjs/common';
import { PublicSiteController } from './public-site.controller';
import { PublicSiteService } from './public-site.service';
import { SettingsModule } from '../settings/settings.module';
import { DriversModule } from '../drivers/drivers.module';
import { MerchantsModule } from '../merchants/merchants.module';

/**
 * Public website API. Reuses the real SettingsService for website content and
 * the global AuditService for the audit trail; everything else is a read-only
 * projection of existing domain data (service zones, orders, driver locations)
 * plus gated self-registration that lands in the admin approval queue.
 */
@Module({
  imports: [SettingsModule, DriversModule, MerchantsModule],
  controllers: [PublicSiteController],
  providers: [PublicSiteService],
})
export class PublicSiteModule {}
