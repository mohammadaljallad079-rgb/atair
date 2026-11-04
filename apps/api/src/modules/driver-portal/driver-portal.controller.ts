import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { DriverContextService } from './driver-context.service';
import { DriverAssignmentsService } from './driver-assignments.service';

class RejectAssignmentBody {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
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
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'The authenticated driver principal' })
  async me(@CurrentUser() user: AuthUser) {
    return this.context.resolve(user);
  }

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
}
