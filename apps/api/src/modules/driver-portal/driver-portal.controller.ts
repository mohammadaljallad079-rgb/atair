import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { DriverContextService } from './driver-context.service';
import { DriverAssignmentsService } from './driver-assignments.service';
import { DriverDeliveriesService } from './driver-deliveries.service';
import { DriverProfileService } from './driver-profile.service';

class RejectAssignmentBody {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

class AvailabilityBody {
  @IsBoolean() isAvailable!: boolean;
}

class DriverLocationBody {
  @Type(() => Number) @IsNumber() @IsLatitude() latitude!: number;
  @Type(() => Number) @IsNumber() @IsLongitude() longitude!: number;
  @IsOptional() @Type(() => Number) @IsNumber() heading?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) speed?: number;
}

class DeliveryStatusBody {
  @IsIn(['driver_arriving', 'picked_up', 'in_transit', 'arriving', 'delivered'])
  status!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

class UpdateDriverProfileBody {
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsString() @MaxLength(60) nationality?: string;
}

class DriverPaginationQuery {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) pageSize?: number;
}

/**
 * Driver Application API (/api/v1/driver/*).
 *
 * The acting driver is always resolved from the signed token
 * (DriverContextService); no endpoint accepts a driver id from the client.
 * DriverBoundaryGuard additionally confines driver-only principals to this
 * surface, so the tenant-wide Admin API is unreachable.
 */
@ApiTags('driver')
@ApiBearerAuth()
@Controller('driver')
export class DriverPortalController {
  constructor(
    private readonly context: DriverContextService,
    private readonly assignments: DriverAssignmentsService,
    private readonly deliveries: DriverDeliveriesService,
    private readonly profile: DriverProfileService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'The authenticated driver principal' })
  async me(@CurrentUser() user: AuthUser) {
    return this.context.resolve(user);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Full driver profile with vehicle and documents' })
  async driverProfile(@CurrentUser() user: AuthUser) {
    return this.profile.me(await this.context.resolve(user));
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the driver own profile (email, address, nationality)' })
  async updateProfile(@CurrentUser() user: AuthUser, @Body() body: UpdateDriverProfileBody) {
    return this.profile.updateProfile(await this.context.resolve(user), body);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Go online/offline' })
  async setAvailability(@CurrentUser() user: AuthUser, @Body() body: AvailabilityBody) {
    return this.profile.setAvailability(await this.context.resolve(user), body.isAvailable);
  }

  @Post('location')
  @ApiOperation({ summary: 'Report the driver current location' })
  async updateLocation(@CurrentUser() user: AuthUser, @Body() body: DriverLocationBody) {
    const ctx = await this.context.resolve(user);
    return this.profile.updateLocation(ctx, body.latitude, body.longitude, body.heading, body.speed);
  }

  // ------------------------------------------------------------- assignments

  @Get('assignments')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Open offers and active assignments for this driver' })
  async list(@CurrentUser() user: AuthUser) {
    const ctx = await this.context.resolve(user);
    return this.assignments.list(ctx);
  }

  @Post('assignments/:id/accept')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Accept an offered assignment' })
  async accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.assignments.accept(ctx, id);
  }

  @Post('assignments/:id/reject')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Reject an offered assignment' })
  async reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: RejectAssignmentBody) {
    const ctx = await this.context.resolve(user);
    return this.assignments.reject(ctx, id, body?.reason);
  }

  // -------------------------------------------------------------- deliveries

  @Get('deliveries')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Active deliveries assigned to this driver' })
  async activeDeliveries(@CurrentUser() user: AuthUser) {
    return this.deliveries.active(await this.context.resolve(user));
  }

  @Get('deliveries/history')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Completed/cancelled delivery history' })
  async deliveryHistory(@CurrentUser() user: AuthUser, @Query() q: DriverPaginationQuery) {
    const ctx = await this.context.resolve(user);
    return this.deliveries.history(ctx, q.pageSize ?? 50, ((q.page ?? 1) - 1) * (q.pageSize ?? 50));
  }

  @Get('deliveries/:id')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'One delivery owned by this driver' })
  async delivery(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deliveries.get(await this.context.resolve(user), id);
  }

  @Patch('deliveries/:id/status')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Advance a delivery status (pickup / in transit / delivered)' })
  async updateDeliveryStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: DeliveryStatusBody,
  ) {
    const ctx = await this.context.resolve(user);
    return this.deliveries.updateStatus(ctx, id, body.status, body.note);
  }

  // ------------------------------------------------------ earnings & wallet

  @Get('earnings')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Earnings summary (today, week, lifetime, wallet balance)' })
  async earnings(@CurrentUser() user: AuthUser) {
    return this.profile.earnings(await this.context.resolve(user));
  }

  @Get('wallet')
  @RequirePermissions([PERMISSIONS.wallets_view])
  @ApiOperation({ summary: 'Driver wallet balance and transactions' })
  async wallet(@CurrentUser() user: AuthUser, @Query() q: DriverPaginationQuery) {
    const ctx = await this.context.resolve(user);
    return this.profile.wallet(ctx, q.pageSize ?? 50, ((q.page ?? 1) - 1) * (q.pageSize ?? 50));
  }

  // ------------------------------------------------------------ notifications

  @Get('notifications')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Driver notifications' })
  async notifications(@CurrentUser() user: AuthUser, @Query() q: DriverPaginationQuery) {
    const ctx = await this.context.resolve(user);
    return this.profile.notifications(ctx, q.pageSize ?? 50, ((q.page ?? 1) - 1) * (q.pageSize ?? 50));
  }

  @Post('notifications/:id/read')
  @RequirePermissions([PERMISSIONS.orders_view])
  @ApiOperation({ summary: 'Mark a notification read' })
  async markNotificationRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const ctx = await this.context.resolve(user);
    return this.profile.markNotificationRead(ctx, id);
  }
}
