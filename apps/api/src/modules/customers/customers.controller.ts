import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { CustomersService } from './customers.service';
import {
  CreateCustomerAddressDto,
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.customers_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: CustomerQueryDto) {
    const { items, total } = await this.customers.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.customers_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.customers_create])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto, @Ip() ip: string) {
    return this.customers.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.customers_update])
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Ip() ip: string,
  ) {
    return this.customers.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Get(':id/addresses')
  @RequirePermissions([PERMISSIONS.customers_view])
  addresses(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.listAddresses(user.tenantId, id);
  }

  @Post(':id/addresses')
  @RequirePermissions([PERMISSIONS.customers_update])
  addAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customers.addAddress(user.tenantId, id, dto);
  }
}
