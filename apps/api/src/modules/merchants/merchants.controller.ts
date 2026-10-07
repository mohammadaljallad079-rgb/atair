import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { CreateMerchantDto, MerchantsService } from './merchants.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

class CreateMerchantBody implements CreateMerchantDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() slug!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsNumber() commissionRate?: number;
}

class BranchBody {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() address!: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() phone?: string;
}

class UpdateMerchantBody extends PartialType(CreateMerchantBody) {
  @IsOptional() @IsIn(['active', 'inactive', 'suspended']) status?: 'active' | 'inactive' | 'suspended';
}

@ApiTags('merchants')
@ApiBearerAuth()
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.merchants_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.merchants.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.merchants_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.merchants.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.merchants_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchantBody, @Ip() ip: string) {
    return this.merchants.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateMerchantBody, @Ip() ip: string) {
    return this.merchants.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post(':id/branches')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  addBranch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: BranchBody, @Ip() ip: string) {
    return this.merchants.addBranch(user.tenantId, id, dto, { userId: user.userId, ip });
  }
}
