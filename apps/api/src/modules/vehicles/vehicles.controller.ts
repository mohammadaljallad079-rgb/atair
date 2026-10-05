import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { CreateVehicleDto, VehiclesService } from './vehicles.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

class CreateVehicleBody implements CreateVehicleDto {
  @IsString() @IsNotEmpty() plateNumber!: string;
  @IsOptional() @IsString() vehicleTypeId?: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsString() color?: string;
}

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get('types')
  @RequirePermissions([PERMISSIONS.vehicles_view])
  types() {
    return this.vehicles.listTypes();
  }

  @Get()
  @RequirePermissions([PERMISSIONS.vehicles_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.vehicles.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleBody, @Ip() ip: string) {
    return this.vehicles.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: Partial<CreateVehicleBody>, @Ip() ip: string) {
    return this.vehicles.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }
}
