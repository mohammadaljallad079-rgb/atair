import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Response } from 'express';
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

class TimeseriesQuery extends DashboardQuery {
  @IsOptional() @IsIn(['day', 'hour'])
  bucket?: 'day' | 'hour';
}

class ExportQuery extends DashboardQuery {
  @IsOptional() @IsString() status?: string;
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

  @Get('timeseries')
  @RequirePermissions([PERMISSIONS.reports_view])
  timeseries(@CurrentUser() user: AuthUser, @Query() q: TimeseriesQuery) {
    const range = ReportsService.resolveRange(q.preset, q.from, q.to);
    return this.reports.timeseries(user.tenantId, range, q.bucket === 'hour' ? 'hour' : 'day');
  }

  @Get('operations')
  @RequirePermissions([PERMISSIONS.reports_view])
  operations(@CurrentUser() user: AuthUser) {
    return this.reports.operations(user.tenantId);
  }

  @Get('drivers')
  @RequirePermissions([PERMISSIONS.reports_view])
  drivers(@CurrentUser() user: AuthUser, @Query() q: DashboardQuery) {
    const range = ReportsService.resolveRange(q.preset, q.from, q.to);
    return this.reports.driversReport(user.tenantId, range);
  }

  @Get('merchants')
  @RequirePermissions([PERMISSIONS.reports_view])
  merchants(@CurrentUser() user: AuthUser, @Query() q: DashboardQuery) {
    const range = ReportsService.resolveRange(q.preset, q.from, q.to);
    return this.reports.merchantsReport(user.tenantId, range);
  }

  @Get('export/orders')
  @RequirePermissions([PERMISSIONS.reports_export])
  async exportOrders(@CurrentUser() user: AuthUser, @Query() q: ExportQuery, @Res() res: Response) {
    const range = ReportsService.resolveRange(q.preset, q.from, q.to);
    const csv = await this.reports.exportOrdersCsv(user.tenantId, range, q.status);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csv);
  }
}
