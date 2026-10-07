import { Body, Controller, Get, Ip, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { NotificationsService, SendNotificationDto } from './notifications.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

class NotificationQueryBody extends PaginationQueryDto {
  @IsOptional() @IsIn(['queued', 'sent', 'failed', 'read']) status?: string;
  @IsOptional() @IsIn(['push', 'sms', 'email', 'whatsapp', 'in_app']) channel?: string;
}

class SendNotificationBody implements SendNotificationDto {
  @IsString() templateCode!: string;
  @IsOptional() @IsUUID() userId?: string | null;
  @IsOptional() @IsUUID() customerId?: string | null;
  @IsOptional() @IsUUID() driverId?: string | null;
  @IsOptional() @IsObject() data?: Record<string, any>;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.notifications_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: NotificationQueryBody) {
    const { items, total } = await this.notifications.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('templates')
  @RequirePermissions([PERMISSIONS.notifications_view])
  templates(@CurrentUser() user: AuthUser) {
    return this.notifications.listTemplates(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.notifications_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.get(user.tenantId, id);
  }

  @Post('send')
  @RequirePermissions([PERMISSIONS.notifications_manage])
  send(@CurrentUser() user: AuthUser, @Body() dto: SendNotificationBody, @Ip() ip: string) {
    return this.notifications.send(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Post(':id/retry')
  @RequirePermissions([PERMISSIONS.notifications_manage])
  retry(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.notifications.retry(user.tenantId, id, { userId: user.userId, ip });
  }

  @Post(':id/read')
  @RequirePermissions([PERMISSIONS.notifications_view])
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.tenantId, id);
  }
}
