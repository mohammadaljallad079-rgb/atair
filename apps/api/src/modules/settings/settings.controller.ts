import { Body, Controller, Get, Ip, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { SettingsService } from './settings.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

class SetSettingBody {
  @IsString() @IsNotEmpty() value!: any;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.settings_view])
  list(@CurrentUser() user: AuthUser) {
    return this.settings.list(user.tenantId);
  }

  @Put(':key')
  @RequirePermissions([PERMISSIONS.settings_manage])
  set(@CurrentUser() user: AuthUser, @Param('key') key: string, @Body() dto: SetSettingBody, @Ip() ip: string) {
    return this.settings.set(user.tenantId, key, dto.value, { userId: user.userId, ip });
  }
}
