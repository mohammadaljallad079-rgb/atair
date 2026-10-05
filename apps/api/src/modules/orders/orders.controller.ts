import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { OrdersService } from './orders.service';
import {
  AssignDriverDto,
  CancelOrderDto,
  CreateOrderDto,
  OrderQueryDto,
  TransitionOrderDto,
  UpdateOrderDto,
} from './dto/order.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.orders_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: OrderQueryDto) {
    const { items, total } = await this.orders.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.orders_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.get(user.tenantId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions([PERMISSIONS.orders_view])
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.timeline(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.orders_create])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto, @Ip() ip: string) {
    return this.orders.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.orders_update])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOrderDto, @Ip() ip: string) {
    return this.orders.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post(':id/transition')
  @RequirePermissions([PERMISSIONS.orders_update])
  transition(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TransitionOrderDto, @Ip() ip: string) {
    const force = user.permissions.includes(PERMISSIONS.orders_force_status);
    return this.orders.transition(user.tenantId, id, dto, { userId: user.userId, ip }, { force });
  }

  @Post(':id/assign')
  @RequirePermissions([PERMISSIONS.orders_assign])
  assign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssignDriverDto, @Ip() ip: string) {
    return this.orders.assignDriver(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post(':id/cancel')
  @RequirePermissions([PERMISSIONS.orders_cancel])
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelOrderDto, @Ip() ip: string) {
    return this.orders.cancel(user.tenantId, id, dto, { userId: user.userId, ip });
  }
}
