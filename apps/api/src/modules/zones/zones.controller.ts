import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { CreateZoneDto, ZonesService } from './zones.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

class CreateZoneBody implements CreateZoneDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsArray() polygon?: number[][];
  @IsOptional() @IsNumber() centerLat?: number;
  @IsOptional() @IsNumber() centerLng?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateZoneBody extends PartialType(CreateZoneBody) {}

@ApiTags('zones')
@ApiBearerAuth()
@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.zones_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.zones.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.zones_manage])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateZoneBody, @Ip() ip: string) {
    return this.zones.create(user.tenantId, dto, { userId: user.userId, ip });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.zones_manage])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateZoneBody, @Ip() ip: string) {
    return this.zones.update(user.tenantId, id, dto, { userId: user.userId, ip });
  }

  @Get('resolve')
  @RequirePermissions([PERMISSIONS.zones_view])
  resolve(@CurrentUser() user: AuthUser, @Query('lat') lat: string, @Query('lng') lng: string) {
    return this.zones.resolveZone(user.tenantId, parseFloat(lat), parseFloat(lng));
  }
}
