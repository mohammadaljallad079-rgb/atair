import { Module } from '@nestjs/common';
import { PublicSiteController } from './public-site.controller';
import { PublicSiteService } from './public-site.service';
import { SettingsModule } from '../settings/settings.module';

/**
 * Public website API. Reuses the real SettingsService for website content and
 * the global AuditService for the audit trail; everything else is a read-only
 * projection of existing domain data (service zones, orders, driver locations).
 */
@Module({
  imports: [SettingsModule],
  controllers: [PublicSiteController],
  providers: [PublicSiteService],
})
export class PublicSiteModule {}
