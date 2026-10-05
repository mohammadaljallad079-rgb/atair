import { Body, Controller, Get, Ip, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { WalletAdjustDto, WalletsService } from './wallets.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.wallets_view])
  list(@CurrentUser() user: AuthUser) {
    return this.wallets.list(user.tenantId);
  }

  @Get('driver/:driverId')
  @RequirePermissions([PERMISSIONS.wallets_view])
  get(@CurrentUser() user: AuthUser, @Param('driverId') driverId: string) {
    return this.wallets.get(user.tenantId, driverId);
  }

  @Post('driver/:driverId/adjust')
  @RequirePermissions([PERMISSIONS.wallets_manage])
  adjust(@CurrentUser() user: AuthUser, @Param('driverId') driverId: string, @Body() dto: WalletAdjustDto, @Ip() ip: string) {
    return this.wallets.adjust(user.tenantId, driverId, dto, { userId: user.userId, ip });
  }
}
