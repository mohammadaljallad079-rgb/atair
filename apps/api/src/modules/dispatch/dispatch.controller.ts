import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { DispatchService } from './dispatch.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dispatch')
@ApiBearerAuth()
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Get('orders/:orderId/offers')
  @RequirePermissions([PERMISSIONS.dispatch_view])
  offers(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.dispatch.offers(user.tenantId, orderId);
  }

  @Get('board')
  @RequirePermissions([PERMISSIONS.dispatch_view])
  board(@CurrentUser() user: AuthUser) {
    return this.dispatch.board(user.tenantId);
  }

  @Post('orders/:orderId/redispatch')
  @RequirePermissions([PERMISSIONS.dispatch_manage])
  redispatch(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.dispatch.startDispatch(user.tenantId, orderId, { userId: user.userId });
  }
}
