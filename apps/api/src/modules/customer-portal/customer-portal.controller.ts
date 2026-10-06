import { Body, Controller, Delete, Get, Headers, HttpCode, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PERMISSIONS } from '@atair/db';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { paginated, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CustomerContextService } from './customer-context.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerOrdersService } from './customer-orders.service';
import { CustomerAccountService } from './customer-account.service';
import { CustomerSupportService } from './customer-support.service';
import {
  CancelCustomerOrderDto,
  CreateCustomerAddressBodyDto,
  CreateCustomerOrderDto,
  CreateCustomerTicketDto,
  CustomerOrderQueryDto,
  CustomerQuoteDto,
  CustomerTicketMessageDto,
  CustomerTicketQueryDto,
  RegisterCustomerDto,
  UpdateCustomerAddressBodyDto,
  UpdateCustomerProfileDto,
} from './dto/customer-portal.dto';

/**
 * Customer Application API (/api/v1/customer/*).
 *
 * The acting customer is always resolved from the signed token
 * (CustomerContextService); no endpoint accepts a customer id from the client.
 * CustomerBoundaryGuard additionally confines customer-only principals to this
 * surface, so the tenant-wide Admin API is unreachable.
 */
@ApiTags('customer')
@ApiBearerAuth()
@Controller('customer')
export class CustomerPortalController {
  constructor(
    private readonly context: CustomerContextService,
    private readonly auth: CustomerAuthService,
    private readonly orders: CustomerOrdersService,
    private readonly account: CustomerAccountService,
    private readonly support: CustomerSupportService,
  ) {}

  // ------------------------------------------------------------------- public

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('auth/register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a consumer account (User + linked Customer) and sign in' })
  register(@Body() dto: RegisterCustomerDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.auth.register(dto, { ip, userAgent });
  }

  @Public()
  @Get('auth/config')
  @ApiOperation({ summary: 'Public registration/payment configuration for the customer app' })
  authConfig() {
    return this.auth.registrationInfo();
  }

  // -------------------------------------------------------------- account/me

  @Get('me')
  @ApiOperation({ summary: 'The authenticated customer principal' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Get('profile')
  async profile(@CurrentUser() user: AuthUser) {
    const ctx = await this.context.resolve(user);
    return this.account.profile(ctx, user.userId);
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateCustomerProfileDto, @Ip() ip: string) {
    const ctx = await this.context.resolve(user);
    return this.account.updateProfile(ctx, user.userId, dto, { ip });
  }

  // -------------------------------------------------------------- addresses

  @Get('addresses')
  @RequirePermissions([PERMISSIONS.orders_view])
  async addresses(@CurrentUser() user: AuthUser) {
    const ctx = await this.context.resolve(user);
    return this.account.addresses(ctx);
  }

  @Post('addresses')
  @RequirePermissions([PERMISSIONS.orders_view])
  async addAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerAddressBodyDto, @Ip() ip: string) {
    const ctx = await this.context.resolve(user);
    return this.account.addAddress(ctx, dto, { userId: user.userId, ip });
  }

  @Patch('addresses/:id')
  @RequirePermissions([PERMISSIONS.orders_view])
  async updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressBodyDto,
    @Ip() ip: string,
  ) {
    const ctx = await this.context.resolve(user);
    return this.account.updateAddress(ctx, id, dto, { userId: user.userId, ip });
  }

  @Delete('addresses/:id')
  @RequirePermissions([PERMISSIONS.orders_view])
  async deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    const ctx = await this.context.resolve(user);
    return this.account.deleteAddress(ctx, id, { userId: user.userId, ip });
  }

  // ----------------------------------------------------------- service areas

  @Get('service-areas')
  @RequirePermissions([PERMISSIONS.orders_view])
  async serviceAreas(@CurrentUser() user: AuthUser) {
    const ctx = await this.context.resolve(user);
    return this.orders.serviceAreas(ctx);
  }

  // ----------------------------------------------------------------- orders

  @Get('orders')
  @RequirePermissions([PERMISSIONS.orders_view])
  async listOrders(@CurrentUser() user: AuthUser, @Query() q: CustomerOrderQueryDto) {
    const ctx = await this.context.resolve(user);
    const { items, total } = await this.orders.list(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post('orders/quote')
  @RequirePermissions([PERMISSIONS.orders_view])
  async quote(@CurrentUser() user: AuthUser, @Body() dto: CustomerQuoteDto) {
    const ctx = await this.context.resolve(user);
    return this.orders.quote(ctx, dto);
  }

  @Post('orders')
  @RequirePermissions([PERMISSIONS.orders_view])
  async createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerOrderDto, @Ip() ip: string) {
    const ctx = await this.context.resolve(user);
    return this.orders.create(ctx, dto, { userId: user.userId, ip });
  }

  @Get('orders/:id')
  @RequirePermissions([PERMISSIONS.orders_view])
  async getOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.orders.get(ctx, id);
  }

  @Get('orders/:id/timeline')
  @RequirePermissions([PERMISSIONS.orders_view])
  async orderTimeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.orders.timeline(ctx, id);
  }

  @Get('orders/:id/tracking')
  @RequirePermissions([PERMISSIONS.tracking_view])
  async orderTracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.orders.tracking(ctx, id);
  }

  @Post('orders/:id/cancel')
  @RequirePermissions([PERMISSIONS.orders_view])
  async cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelCustomerOrderDto,
    @Ip() ip: string,
  ) {
    const ctx = await this.context.resolve(user);
    return this.orders.cancel(ctx, id, dto, { userId: user.userId, ip });
  }

  // ---------------------------------------------------------- notifications

  @Get('notifications')
  @RequirePermissions([PERMISSIONS.orders_view])
  async notifications(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const ctx = await this.context.resolve(user);
    const { items, total } = await this.account.notifications(ctx, user.userId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post('notifications/:id/read')
  @RequirePermissions([PERMISSIONS.orders_view])
  async markNotificationRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.account.markNotificationRead(ctx, user.userId, id);
  }

  // --------------------------------------------------------------- support

  @Get('support/tickets')
  @RequirePermissions([PERMISSIONS.orders_view])
  async listTickets(@CurrentUser() user: AuthUser, @Query() q: CustomerTicketQueryDto) {
    const ctx = await this.context.resolve(user);
    const { items, total } = await this.support.list(ctx, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post('support/tickets')
  @RequirePermissions([PERMISSIONS.orders_view])
  async createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerTicketDto, @Ip() ip: string) {
    const ctx = await this.context.resolve(user);
    return this.support.create(ctx, dto, { userId: user.userId, ip });
  }

  @Get('support/tickets/:id')
  @RequirePermissions([PERMISSIONS.orders_view])
  async getTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.support.get(ctx, id);
  }

  @Post('support/tickets/:id/messages')
  @RequirePermissions([PERMISSIONS.orders_view])
  async addTicketMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CustomerTicketMessageDto,
    @Ip() ip: string,
  ) {
    const ctx = await this.context.resolve(user);
    return this.support.addMessage(ctx, id, dto, { userId: user.userId, ip });
  }
}
