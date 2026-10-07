import { Body, Controller, Get, Ip, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentQueryDto, RefundDto } from './dto/payment.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.payments_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaymentQueryDto) {
    const { items, total } = await this.payments.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.payments_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto, @Ip() ip: string) {
    return this.payments.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Post(':id/mark-paid')
  @RequirePermissions([PERMISSIONS.payments_manage])
  markPaid(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.payments.markPaid(user.tenantId, id, { userId: user.userId, ip });
  }

  @Post(':id/refund')
  @RequirePermissions([PERMISSIONS.payments_refund])
  refund(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RefundDto, @Ip() ip: string) {
    return this.payments.refund(user.tenantId, id, dto, { userId: user.userId, ip });
  }
}
