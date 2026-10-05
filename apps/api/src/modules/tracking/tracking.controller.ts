import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { TrackingService } from './tracking.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('live')
  @RequirePermissions([PERMISSIONS.tracking_view])
  live(@CurrentUser() user: AuthUser) {
    return this.tracking.liveOps(user.tenantId);
  }

  @Get('orders/:id')
  @RequirePermissions([PERMISSIONS.tracking_view])
  track(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tracking.track(user.tenantId, id);
  }
}
