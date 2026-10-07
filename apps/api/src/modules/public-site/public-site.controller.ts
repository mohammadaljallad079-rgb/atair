import { Body, Controller, Get, Headers, Ip, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PublicSiteService } from './public-site.service';
import { PublicContactDto } from './dto/public-site.dto';

/**
 * Public website API (/api/v1/public/*) — no authentication.
 *
 * Intentionally small and read-mostly. Every response is safe for an anonymous
 * visitor: branding/content settings, active service areas, a secure tracking
 * lookup, and a contact form that becomes a real support ticket.
 */
@ApiTags('public')
@Controller('public')
export class PublicSiteController {
  constructor(private readonly publicSite: PublicSiteService) {}

  @Public()
  @Get('site')
  @ApiOperation({ summary: 'Public branding, website content settings and service areas' })
  site(@Query('tenant') tenant?: string) {
    return this.publicSite.site(tenant);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('track/:code')
  @ApiOperation({ summary: 'Track an order by its opaque public tracking code' })
  track(@Param('code') code: string) {
    return this.publicSite.track(code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  @ApiOperation({ summary: 'Submit a public contact message (persisted as a support ticket)' })
  contact(
    @Body() dto: PublicContactDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Query('tenant') tenant?: string,
  ) {
    return this.publicSite.contact(dto, { ip, userAgent, tenantSlug: tenant });
  }
}
