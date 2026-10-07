import { Body, Controller, Get, Ip, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { WalletsService } from './wallets.service';
import { WalletAdjustDto } from './dto/wallet.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.wallets_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.wallets.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('driver/:driverId')
  @RequirePermissions([PERMISSIONS.wallets_view])
  get(@CurrentUser() user: AuthUser, @Param('driverId') driverId: string, @Query() q: PaginationQueryDto) {
    return this.wallets.get(user.tenantId, driverId, q);
  }

  @Post('driver/:driverId/adjust')
  @RequirePermissions([PERMISSIONS.wallets_manage])
  adjust(@CurrentUser() user: AuthUser, @Param('driverId') driverId: string, @Body() dto: WalletAdjustDto, @Ip() ip: string) {
    return this.wallets.adjust(user.tenantId, driverId, dto, { userId: user.userId, ip });
  }
}
