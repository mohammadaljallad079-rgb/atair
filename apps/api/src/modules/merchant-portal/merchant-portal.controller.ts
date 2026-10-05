import {
  Body,
  Controller,
  Get,
  Header,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PERMISSIONS } from '@atair/db';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';
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
import {
  CreateMerchantAddressDto,
  CreateMerchantBranchDto,
  CreateMerchantCustomerDto,
  CreateMerchantOrderDto,
  CreateMerchantTicketDto,
  ImportOrdersDto,
  InviteTeamMemberDto,
  MerchantBranchQueryDto,
  MerchantCodQueryDto,
  MerchantCustomerQueryDto,
  MerchantOrderQueryDto,
  MerchantPaymentQueryDto,
  MerchantQuoteDto,
  MerchantReportsQueryDto,
  MerchantScopedQueryDto,
  MerchantSettlementQueryDto,
  MerchantTicketMessageDto,
  MerchantTicketQueryDto,
  MerchantTimeseriesQueryDto,
  UpdateBusinessSettingsDto,
  UpdateMerchantCustomerDto,
  UpdateMerchantProfileDto,
  UpdateTeamMemberDto,
} from './dto/merchant-portal.dto';

@ApiTags('merchant-portal')
@ApiBearerAuth()
@Controller('merchant')
export class MerchantPortalController {
  constructor(
    private readonly ctx: MerchantContextService,
    private readonly orders: MerchantOrdersService,
    private readonly reports: MerchantReportsService,
    private readonly finance: MerchantFinanceService,
    private readonly customers: MerchantCustomersService,
    private readonly branches: MerchantBranchesService,
    private readonly team: MerchantTeamService,
    private readonly support: MerchantSupportService,
    private readonly account: MerchantAccountService,
    private readonly importer: MerchantImportService,
    private readonly exporter: MerchantExportService,
  ) {}

  // ---------------------------------------------------------------- context
  @Get('context')
  @RequirePermissions([PERMISSIONS.orders_view], 'any')
  @ApiOperation({ summary: 'Resolve the authenticated merchant context' })
  async context(@CurrentUser() user: AuthUser, @Query('merchantId') merchantId?: string) {
    const ctx = await this.ctx.resolve(user, merchantId);
    return { ...ctx, merchantIds: user.merchantIds ?? [] };
  }

  // --------------------------------------------------------------- dashboard
  @Get('dashboard')
  @RequirePermissions([PERMISSIONS.reports_view])
  async dashboard(@CurrentUser() user: AuthUser, @Query() q: MerchantReportsQueryDto) {
    const ctx = await this.ctx.resolve(user);
    return this.reports.dashboard(ctx, MerchantReportsService.resolveRange(q.preset, q.from, q.to));
  }

  @Get('reports/summary')
  @RequirePermissions([PERMISSIONS.reports_view])
  async reportSummary(@CurrentUser() user: AuthUser, @Query() q: MerchantReportsQueryDto) {
    const ctx = await this.ctx.resolve(user);
    return this.reports.summary(ctx, MerchantReportsService.resolveRange(q.preset, q.from, q.to));
  }

  @Get('reports/orders-by-status')
  @RequirePermissions([PERMISSIONS.reports_view])
  async ordersByStatus(@CurrentUser() user: AuthUser, @Query() q: MerchantReportsQueryDto) {
    const ctx = await this.ctx.resolve(user);
    return this.reports.ordersByStatus(ctx, MerchantReportsService.resolveRange(q.preset, q.from, q.to));
  }

  @Get('reports/timeseries')
  @RequirePermissions([PERMISSIONS.reports_view])
  async timeseries(@CurrentUser() user: AuthUser, @Query() q: MerchantTimeseriesQueryDto) {
    const ctx = await this.ctx.resolve(user);
    return this.reports.timeseries(
      ctx,
      MerchantReportsService.resolveRange(q.preset, q.from, q.to),
      q.bucket === 'hour' ? 'hour' : 'day',
    );
  }

  @Get('reports/branches')
  @RequirePermissions([PERMISSIONS.reports_view])
  async branchPerformance(@CurrentUser() user: AuthUser, @Query() q: MerchantReportsQueryDto) {
    const ctx = await this.ctx.resolve(user);
    return this.reports.branchPerformance(ctx, MerchantReportsService.resolveRange(q.preset, q.from, q.to));
  }

  // ------------------------------------------------------------------ orders
  @Get('orders')
  @RequirePermissions([PERMISSIONS.orders_view])
  async listOrders(@CurrentUser() user: AuthUser, @Query() q: MerchantOrderQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.orders.list(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('orders/:id')
  @RequirePermissions([PERMISSIONS.orders_view])
  async getOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.orders.get(ctx, id);
  }

  @Get('orders/:id/timeline')
  @RequirePermissions([PERMISSIONS.orders_view])
  async orderTimeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.orders.timeline(ctx, id);
  }

  @Get('orders/:id/tracking')
  @RequirePermissions([PERMISSIONS.orders_view])
  async orderTracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.orders.tracking(ctx, id);
  }

  @Post('orders/quote')
  @RequirePermissions([PERMISSIONS.orders_create], 'any')
  async quote(@CurrentUser() user: AuthUser, @Body() dto: MerchantQuoteDto) {
    const ctx = await this.ctx.resolve(user);
    return this.orders.quote(ctx, dto);
  }

  @Post('orders')
  @RequirePermissions([PERMISSIONS.orders_create])
  async createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchantOrderDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.orders.create(ctx, dto, { userId: user.userId, ip });
  }

  @Post('orders/:id/cancel')
  @RequirePermissions([PERMISSIONS.orders_cancel])
  async cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Ip() ip: string,
  ) {
    const ctx = await this.ctx.resolve(user);
    return this.orders.cancel(ctx, id, body?.reason, { userId: user.userId, ip });
  }

  @Post('orders/import/template')
  @RequirePermissions([PERMISSIONS.orders_create], 'any')
  importTemplate() {
    return this.importer.template();
  }

  @Post('orders/import')
  @RequirePermissions([PERMISSIONS.orders_create])
  async importOrders(@CurrentUser() user: AuthUser, @Body() dto: ImportOrdersDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.importer.import(ctx, dto, { userId: user.userId, ip });
  }

  // ---------------------------------------------------------------- customers
  @Get('customers')
  @RequirePermissions([PERMISSIONS.customers_view])
  async listCustomers(@CurrentUser() user: AuthUser, @Query() q: MerchantCustomerQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.customers.list(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('customers/:id')
  @RequirePermissions([PERMISSIONS.customers_view])
  async getCustomer(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.customers.get(ctx, id);
  }

  @Post('customers')
  @RequirePermissions([PERMISSIONS.customers_create])
  async createCustomer(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchantCustomerDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.customers.create(ctx, dto, { userId: user.userId, ip });
  }

  @Patch('customers/:id')
  @RequirePermissions([PERMISSIONS.customers_update])
  async updateCustomer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMerchantCustomerDto,
    @Ip() ip: string,
  ) {
    const ctx = await this.ctx.resolve(user);
    return this.customers.update(ctx, id, dto, { userId: user.userId, ip });
  }

  @Get('customers/:id/addresses')
  @RequirePermissions([PERMISSIONS.customers_view])
  async customerAddresses(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.customers.addresses(ctx, id);
  }

  @Post('customers/:id/addresses')
  @RequirePermissions([PERMISSIONS.customers_update])
  async addCustomerAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateMerchantAddressDto,
  ) {
    const ctx = await this.ctx.resolve(user);
    return this.customers.addAddress(ctx, id, dto);
  }

  // ----------------------------------------------------------------- branches
  @Get('branches')
  @RequirePermissions([PERMISSIONS.orders_view], 'any')
  async listBranches(@CurrentUser() user: AuthUser, @Query() q: MerchantBranchQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.branches.list(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('branches/:id')
  @RequirePermissions([PERMISSIONS.orders_view], 'any')
  async getBranch(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.branches.get(ctx, id);
  }

  @Post('branches')
  @RequirePermissions([PERMISSIONS.settings_manage], 'any')
  async createBranch(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchantBranchDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.branches.create(ctx, dto, { userId: user.userId, ip });
  }

  @Patch('branches/:id')
  @RequirePermissions([PERMISSIONS.settings_manage], 'any')
  async updateBranch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMerchantBranchDto>,
    @Ip() ip: string,
  ) {
    const ctx = await this.ctx.resolve(user);
    return this.branches.update(ctx, id, dto, { userId: user.userId, ip });
  }

  // --------------------------------------------------------------------- team
  @Get('team')
  @RequirePermissions([PERMISSIONS.users_view])
  async listTeam(@CurrentUser() user: AuthUser, @Query('merchantId') merchantId?: string) {
    const ctx = await this.ctx.resolve(user, merchantId);
    return this.team.list(ctx);
  }

  @Post('team')
  @RequirePermissions([PERMISSIONS.users_create])
  async inviteTeam(@CurrentUser() user: AuthUser, @Body() dto: InviteTeamMemberDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.team.invite(ctx, dto, { userId: user.userId, ip });
  }

  @Patch('team/:userId')
  @RequirePermissions([PERMISSIONS.users_update])
  async updateTeam(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateTeamMemberDto,
    @Ip() ip: string,
  ) {
    const ctx = await this.ctx.resolve(user);
    return this.team.update(ctx, userId, dto, { userId: user.userId, ip });
  }

  // ----------------------------------------------------------------- payments
  @Get('payments')
  @RequirePermissions([PERMISSIONS.payments_view])
  async listPayments(@CurrentUser() user: AuthUser, @Query() q: MerchantPaymentQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.finance.payments(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('cod')
  @RequirePermissions([PERMISSIONS.payments_view])
  async listCod(@CurrentUser() user: AuthUser, @Query() q: MerchantCodQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.finance.cod(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('cod/summary')
  @RequirePermissions([PERMISSIONS.payments_view])
  async codSummary(@CurrentUser() user: AuthUser, @Query('merchantId') merchantId?: string) {
    const ctx = await this.ctx.resolve(user, merchantId);
    return this.finance.codSummary(ctx);
  }

  @Get('settlements')
  @RequirePermissions([PERMISSIONS.payments_view])
  async listSettlements(@CurrentUser() user: AuthUser, @Query() q: MerchantSettlementQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.finance.settlements(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('settlements/:id')
  @RequirePermissions([PERMISSIONS.payments_view])
  async getSettlement(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.finance.settlement(ctx, id);
  }

  // ------------------------------------------------------------------ support
  @Get('support/tickets')
  @RequirePermissions([PERMISSIONS.support_view])
  async listTickets(@CurrentUser() user: AuthUser, @Query() q: MerchantTicketQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.support.list(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('support/tickets/:id')
  @RequirePermissions([PERMISSIONS.support_view])
  async getTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.support.get(ctx, id);
  }

  @Post('support/tickets')
  @RequirePermissions([PERMISSIONS.support_manage], 'any')
  async createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchantTicketDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.support.create(ctx, dto, { userId: user.userId, ip });
  }

  @Post('support/tickets/:id/messages')
  @RequirePermissions([PERMISSIONS.support_manage], 'any')
  async addTicketMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MerchantTicketMessageDto,
    @Ip() ip: string,
  ) {
    const ctx = await this.ctx.resolve(user);
    return this.support.addMessage(ctx, id, dto, { userId: user.userId, ip });
  }

  // ------------------------------------------------------------ notifications
  @Get('notifications')
  @RequirePermissions([PERMISSIONS.notifications_view])
  async listNotifications(@CurrentUser() user: AuthUser, @Query() q: MerchantScopedQueryDto) {
    const ctx = await this.ctx.resolve(user, q.merchantId);
    const { items, total } = await this.account.notifications(ctx, user.userId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post('notifications/:id/read')
  @RequirePermissions([PERMISSIONS.notifications_view])
  async readNotification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.ctx.resolve(user);
    return this.account.markNotificationRead(ctx, id);
  }

  // ---------------------------------------------------------- profile/settings
  @Get('profile')
  async getProfile(@CurrentUser() user: AuthUser) {
    const ctx = await this.ctx.resolve(user);
    return this.account.profile(ctx, user.userId);
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateMerchantProfileDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.account.updateProfile(ctx, user.userId, dto, { userId: user.userId, ip });
  }

  @Get('settings')
  @RequirePermissions([PERMISSIONS.settings_view], 'any')
  async getSettings(@CurrentUser() user: AuthUser, @Query('merchantId') merchantId?: string) {
    const ctx = await this.ctx.resolve(user, merchantId);
    return this.account.businessSettings(ctx);
  }

  @Patch('settings')
  @RequirePermissions([PERMISSIONS.settings_manage], 'any')
  async updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateBusinessSettingsDto, @Ip() ip: string) {
    const ctx = await this.ctx.resolve(user);
    return this.account.updateBusinessSettings(ctx, dto, { userId: user.userId, ip });
  }

  // ------------------------------------------------------------------- export
  @Get('export')
  @RequirePermissions([PERMISSIONS.reports_export])
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Query('resource') resource: string = 'orders',
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('merchantId') merchantId: string | undefined,
    @Res() res: Response,
  ) {
    const ctx = await this.ctx.resolve(user, merchantId);
    const { filename, content } = await this.exporter.export(ctx, resource, from, to);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${content}`);
  }
}
