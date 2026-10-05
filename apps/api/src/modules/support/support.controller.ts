import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { CreateTicketDto, SupportService } from './support.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

class CreateTicketBody implements CreateTicketDto {
  @IsString() @IsNotEmpty() subject!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent']) priority?: 'low' | 'normal' | 'high' | 'urgent';
}

class TicketQuery extends PaginationQueryDto {
  @IsOptional() @IsIn(['open', 'pending', 'resolved', 'closed']) status?: string;
}

class MessageBody {
  @IsString() @IsNotEmpty() body!: string;
}

class StatusBody {
  @IsIn(['open', 'pending', 'resolved', 'closed']) status!: string;
}

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  @RequirePermissions([PERMISSIONS.support_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: TicketQuery) {
    const { items, total } = await this.support.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('tickets/:id')
  @RequirePermissions([PERMISSIONS.support_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.get(user.tenantId, id);
  }

  @Post('tickets')
  @RequirePermissions([PERMISSIONS.support_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketBody, @Ip() ip: string) {
    return this.support.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Post('tickets/:id/messages')
  @RequirePermissions([PERMISSIONS.support_manage])
  addMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MessageBody, @Ip() ip: string) {
    return this.support.addMessage(user.tenantId, id, dto.body, { userId: user.userId, ip });
  }

  @Patch('tickets/:id/status')
  @RequirePermissions([PERMISSIONS.support_manage])
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StatusBody, @Ip() ip: string) {
    return this.support.setStatus(user.tenantId, id, dto.status, { userId: user.userId, ip });
  }
}
