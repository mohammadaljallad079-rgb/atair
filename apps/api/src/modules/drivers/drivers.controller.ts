import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { DriversService } from './drivers.service';
import {
  CreateDriverDto,
  DriverQueryDto,
  ReviewDocumentDto,
  UpdateDriverDto,
  UpdateDriverLocationDto,
} from './dto/driver.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';

class SuspendBody {
  @IsOptional() @IsString() reason?: string;
}

class AvailabilityBody {
  @IsBoolean() isAvailable!: boolean;
}

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.drivers_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: DriverQueryDto) {
    const { items, total } = await this.drivers.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('locations')
  @RequirePermissions([PERMISSIONS.tracking_view])
  locations(@CurrentUser() user: AuthUser) {
    return this.drivers.latestLocations(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.drivers_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.drivers.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.drivers_create])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDriverDto, @Ip() ip: string) {
    return this.drivers.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.drivers_update])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDriverDto, @Ip() ip: string) {
    return this.drivers.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post(':id/suspend')
  @RequirePermissions([PERMISSIONS.drivers_suspend])
  suspend(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: SuspendBody,
    @Ip() ip: string,
  ) {
    return this.drivers.suspend(user.tenantId, id, body?.reason, { userId: user.userId, ip });
  }

  @Post(':id/unsuspend')
  @RequirePermissions([PERMISSIONS.drivers_suspend])
  unsuspend(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.drivers.unsuspend(user.tenantId, id, { userId: user.userId, ip });
  }

  @Patch(':id/availability')
  @RequirePermissions([PERMISSIONS.drivers_update])
  setAvailability(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AvailabilityBody,
    @Ip() ip: string,
  ) {
    return this.drivers.setAvailability(user.tenantId, id, body.isAvailable, { userId: user.userId, ip });
  }

  @Post(':id/location')
  @RequirePermissions([PERMISSIONS.tracking_view])
  updateLocation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDriverLocationDto) {
    return this.drivers.updateLocation(user.tenantId, id, dto);
  }

  @Post(':id/documents/:documentId/review')
  @RequirePermissions([PERMISSIONS.drivers_verify])
  reviewDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() dto: ReviewDocumentDto,
    @Ip() ip: string,
  ) {
    return this.drivers.reviewDocument(user.tenantId, id, documentId, dto, { userId: user.userId, ip });
  }

  @Post(':id/vehicle/:vehicleId')
  @RequirePermissions([PERMISSIONS.drivers_update])
  assignVehicle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('vehicleId') vehicleId: string,
    @Ip() ip: string,
  ) {
    return this.drivers.assignVehicle(user.tenantId, id, vehicleId, { userId: user.userId, ip });
  }

  @Post(':id/vehicle/:vehicleId/unassign')
  @RequirePermissions([PERMISSIONS.drivers_update])
  unassignVehicle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('vehicleId') vehicleId: string,
    @Ip() ip: string,
  ) {
    return this.drivers.unassignVehicle(user.tenantId, id, vehicleId, { userId: user.userId, ip });
  }
}
