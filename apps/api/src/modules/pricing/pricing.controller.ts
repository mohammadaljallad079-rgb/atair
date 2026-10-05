import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { PricingService, QuoteDto, UpsertPricingRuleDto } from './pricing.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

@ApiTags('pricing')
@ApiBearerAuth()
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get('rules')
  @RequirePermissions([PERMISSIONS.pricing_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.pricing.listRules(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post('rules')
  @RequirePermissions([PERMISSIONS.pricing_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertPricingRuleDto, @Ip() ip: string) {
    return this.pricing.createRule(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch('rules/:id')
  @RequirePermissions([PERMISSIONS.pricing_manage])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: Partial<UpsertPricingRuleDto>, @Ip() ip: string) {
    return this.pricing.updateRule(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post('quote')
  @RequirePermissions([PERMISSIONS.pricing_view])
  quote(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    return this.pricing.quote(user.tenantId, dto);
  }
}
