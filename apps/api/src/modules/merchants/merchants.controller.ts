import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@atair/db';
import { MerchantsService } from './merchants.service';
import {
  CreateMerchantDto,
  MerchantBranchDto,
  MerchantQueryDto,
  RejectMerchantDto,
  ReviewDocumentDto,
  SuspendMerchantDto,
  UpdateMerchantDto,
} from './dto/merchant.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/dto/pagination.dto';

@ApiTags('merchants')
@ApiBearerAuth()
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.merchants_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: MerchantQueryDto) {
    const { items, total } = await this.merchants.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.merchants_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.merchants.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.merchants_manage])
  @ApiOperation({ summary: 'Create a merchant (optionally with owner login and documents)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMerchantDto, @Ip() ip: string) {
    return this.merchants.create(user.tenantId, dto, { userId: user.userId, ip }, { source: 'admin' });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateMerchantDto, @Ip() ip: string) {
    return this.merchants.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post(':id/approve')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  @ApiOperation({ summary: 'Approve a pending merchant' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.merchants.approve(user.tenantId, id, { userId: user.userId, ip });
  }

  @Post(':id/reject')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  @ApiOperation({ summary: 'Reject a pending merchant' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectMerchantDto, @Ip() ip: string) {
    return this.merchants.reject(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Post(':id/suspend')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SuspendMerchantDto, @Ip() ip: string) {
    return this.merchants.suspend(user.tenantId, id, dto?.reason, { userId: user.userId, ip });
  }

  @Post(':id/reactivate')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.merchants.reactivate(user.tenantId, id, { userId: user.userId, ip });
  }

  @Post(':id/documents/:documentId/review')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  reviewDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() dto: ReviewDocumentDto,
    @Ip() ip: string,
  ) {
    return this.merchants.reviewDocument(user.tenantId, id, documentId, dto, { userId: user.userId, ip });
  }

  @Post(':id/branches')
  @RequirePermissions([PERMISSIONS.merchants_manage])
  addBranch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MerchantBranchDto, @Ip() ip: string) {
    return this.merchants.addBranch(user.tenantId, id, dto, { userId: user.userId, ip });
  }
}
