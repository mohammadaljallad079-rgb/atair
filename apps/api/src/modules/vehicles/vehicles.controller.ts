import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { CreateVehicleDto, VehicleQueryDto, VehiclesService } from './vehicles.service';
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

class VehicleQuery extends PaginationQueryDto implements VehicleQueryDto {
  @IsOptional() @IsIn(['active', 'inactive', 'maintenance']) status?: string;
}

class VehicleStatusBody {
  @IsIn(['active', 'inactive', 'maintenance']) status!: 'active' | 'inactive' | 'maintenance';
}

class UpdateVehicleBody extends PartialType(CreateVehicleBody) {}

class AssignVehicleDriverBody {
  @IsUUID() driverId!: string;
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
  async list(@CurrentUser() user: AuthUser, @Query() q: VehicleQuery) {
    const { items, total } = await this.vehicles.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.vehicles_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleBody, @Ip() ip: string) {
    return this.vehicles.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateVehicleBody, @Ip() ip: string) {
    return this.vehicles.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Patch(':id/status')
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VehicleStatusBody, @Ip() ip: string) {
    return this.vehicles.setStatus(user.tenantId, id, dto.status, { userId: user.userId, ip });
  }

  @Post(':id/driver')
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  assignDriver(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssignVehicleDriverBody, @Ip() ip: string) {
    return this.vehicles.assignDriver(user.tenantId, id, dto.driverId, { userId: user.userId, ip });
  }

  @Post(':id/driver/:driverId/unassign')
  @RequirePermissions([PERMISSIONS.vehicles_manage])
  unassignDriver(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('driverId') driverId: string, @Ip() ip: string) {
    return this.vehicles.unassignDriver(user.tenantId, id, driverId, { userId: user.userId, ip });
  }
}
