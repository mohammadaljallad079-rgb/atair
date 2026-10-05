import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.notifications_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.notifications.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post(':id/read')
  @RequirePermissions([PERMISSIONS.notifications_view])
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.tenantId, id);
  }
}
