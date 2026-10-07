import { Body, Controller, Delete, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PERMISSIONS } from '@atair/db';
import { CreateUserDto, UpdateUserDto, UpsertRoleDto, UsersService } from './users.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';

class CreateUserBody implements CreateUserDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(8) password!: string;
  @IsArray() roleSlugs!: string[];
  @IsOptional() @IsString() branchId?: string;
}

class UpdateUserBody implements UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(['active', 'invited', 'suspended', 'locked']) status?: any;
  @IsOptional() @IsArray() roleSlugs?: string[];
}

class UpsertRoleBody implements UpsertRoleDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() permissions!: string[];
}

class UpdateRoleBody extends PartialType(UpsertRoleBody) {}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions([PERMISSIONS.users_view])
  async list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.users.list(user.tenantId, q);
    return paginated(items, total, q.page, q.pageSize);
  }

  @Get('roles')
  @RequirePermissions([PERMISSIONS.users_view])
  roles(@CurrentUser() user: AuthUser) {
    return this.users.listRoles(user.tenantId);
  }

  @Post('roles')
  @RequirePermissions([PERMISSIONS.users_manage_roles])
  createRole(@CurrentUser() user: AuthUser, @Body() dto: UpsertRoleBody, @Ip() ip: string) {
    return this.users.createRole(user.tenantId, dto, this.actor(user, ip));
  }

  @Patch('roles/:id')
  @RequirePermissions([PERMISSIONS.users_manage_roles])
  updateRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRoleBody, @Ip() ip: string) {
    return this.users.updateRole(user.tenantId, id, dto, this.actor(user, ip));
  }

  @Delete('roles/:id')
  @RequirePermissions([PERMISSIONS.users_manage_roles])
  deleteRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.users.deleteRole(user.tenantId, id, this.actor(user, ip));
  }

  @Get('permissions')
  @RequirePermissions([PERMISSIONS.users_manage_roles])
  permissions() {
    return this.users.listPermissions();
  }

  @Get(':id')
  @RequirePermissions([PERMISSIONS.users_view])
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions([PERMISSIONS.users_create])
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserBody, @Ip() ip: string) {
    return this.users.create(user.tenantId, dto, this.actor(user, ip));
  }

  @Patch(':id')
  @RequirePermissions([PERMISSIONS.users_update])
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserBody, @Ip() ip: string) {
    return this.users.update(user.tenantId, id, dto, this.actor(user, ip));
  }

  @Post(':id/reset-password')
  @RequirePermissions([PERMISSIONS.users_update])
  resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.users.resetPassword(user.tenantId, id, this.actor(user, ip));
  }

  @Post(':id/revoke-sessions')
  @RequirePermissions([PERMISSIONS.users_update])
  revokeSessions(@CurrentUser() user: AuthUser, @Param('id') id: string, @Ip() ip: string) {
    return this.users.revokeSessions(user.tenantId, id, this.actor(user, ip));
  }

  private actor(user: AuthUser, ip: string) {
    return { userId: user.userId, ip, permissions: user.permissions, isPlatformAdmin: user.isPlatformAdmin };
  }
}
