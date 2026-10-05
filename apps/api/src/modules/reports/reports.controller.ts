import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

class DashboardQuery {
  @IsOptional() @IsIn(['today', 'yesterday', 'week', 'month', 'custom'])
  preset?: string;

  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions([PERMISSIONS.reports_view])
  dashboard(@CurrentUser() user: AuthUser, @Query() q: DashboardQuery) {
    const range = ReportsService.resolveRange(q.preset, q.from, q.to);
    return this.reports.dashboard(user.tenantId, range);
  }

  @Get('orders-by-status')
  @RequirePermissions([PERMISSIONS.reports_view])
  ordersByStatus(@CurrentUser() user: AuthUser, @Query() q: DashboardQuery) {
    const range = ReportsService.resolveRange(q.preset, q.from, q.to);
    return this.reports.ordersByStatus(user.tenantId, range);
  }
}
