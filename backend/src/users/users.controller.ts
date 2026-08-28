import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/create-user.dto.js';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS, PERMISSION_GROUPS } from '../auth/permissions.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.js';

/**
 * The gérant's administration screen. Every route needs users:manage — the
 * class-level decorator means a new endpoint here can't accidentally be added
 * without it.
 */
@Controller('users')
@RequirePermissions(PERMISSIONS.USERS_MANAGE)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** The permission vocabulary, grouped, so the UI doesn't hardcode it. */
  @Get('permissions')
  listPermissions() {
    return PERMISSION_GROUPS;
  }

  @Get('roles')
  listRoles() {
    return this.users.listRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.users.createRole(dto);
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.users.updateRole(id, dto);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.users.deleteRole(id);
  }

  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.users.list(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.update(id, dto, actor);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setActive(id, false, actor);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setActive(id, true, actor);
  }

  @Patch(':id/password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto);
  }
}
