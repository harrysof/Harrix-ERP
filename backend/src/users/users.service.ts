import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword } from '../auth/auth.service.js';
import { parsePermissions, serializePermissions, unknownPermissions } from '../auth/permissions.js';
import type { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/create-user.dto.js';
import type { CreateRoleDto, UpdateRoleDto } from './dto/role.dto.js';
import type { AuthenticatedUser } from '../auth/current-user.js';
import { t } from '../i18n/messages/index.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------ users

  async list(includeInactive: boolean) {
    const users = await this.prisma.user.findMany({
      where: includeInactive ? {} : { active: true },
      include: { role: true },
      orderBy: [{ active: 'desc' }, { fullName: 'asc' }],
    });
    return users.map((u) => this.toPublic(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException(t('users.userNotFound', { id }));
    return this.toPublic(user);
  }

  async create(dto: CreateUserDto) {
    const login = normalizeLogin(dto.login);
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException(t('users.unknownRole', { id: dto.roleId }));

    try {
      const user = await this.prisma.user.create({
        data: {
          login,
          fullName: dto.fullName.trim(),
          passwordHash: await hashPassword(dto.password),
          roleId: dto.roleId,
        },
        include: { role: true },
      });
      return this.toPublic(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(t('users.loginExists', { login }));
      }
      throw error;
    }
  }

  /**
   * Edits name, login and role. Not the password — that goes through
   * resetPassword, so a routine edit can never change someone's credentials
   * by accident.
   */
  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException(t('users.userNotFound', { id }));

    if (dto.roleId && dto.roleId !== user.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new BadRequestException(t('users.unknownRole', { id: dto.roleId }));
      // Changing your own role could strip your own users:manage and lock the
      // factory out of its own administration.
      if (id === actor.id) {
        throw new BadRequestException(t('users.cannotChangeOwnRole'));
      }
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.login !== undefined ? { login: normalizeLogin(dto.login) } : {}),
          ...(dto.roleId !== undefined ? { roleId: dto.roleId } : {}),
        },
        include: { role: true },
      });
      return this.toPublic(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(t('users.loginExistsGeneric'));
      }
      throw error;
    }
  }

  /**
   * Deactivate rather than delete — "workers leave, but their audit trail must
   * stay attributable" (build plan). A deactivated user can't log in, and the
   * JwtAuthGuard re-checks on every request, so any session they already have
   * dies immediately rather than lingering until the token expires.
   */
  async setActive(id: string, active: boolean, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(t('users.userNotFound', { id }));

    if (!active) {
      if (id === actor.id) {
        throw new BadRequestException(t('users.cannotDeactivateSelf'));
      }
      await this.assertNotLastAdministrator(id);
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { active }, include: { role: true } });
    return this.toPublic(updated);
  }

  /** The gérant setting a new password for someone who forgot theirs. */
  async resetPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(t('users.userNotFound', { id }));
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(dto.newPassword) } });
    return { id, passwordReset: true };
  }

  // ------------------------------------------------------------------ roles

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return roles.map((r) => ({
      id: r.id,
      key: r.key,
      label: r.label,
      description: r.description,
      permissions: parsePermissions(r.permissions),
      isProtected: r.isProtected,
      sortOrder: r.sortOrder,
      userCount: r._count.users,
    }));
  }

  async createRole(dto: CreateRoleDto) {
    assertKnownPermissions(dto.permissions);
    try {
      const role = await this.prisma.role.create({
        data: {
          key: dto.key.trim().toLowerCase(),
          label: dto.label.trim(),
          description: dto.description?.trim() ?? '',
          permissions: serializePermissions(dto.permissions),
          sortOrder: dto.sortOrder ?? 100,
        },
      });
      return { ...role, permissions: parsePermissions(role.permissions) };
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictException(t('users.roleKeyExists', { key: dto.key }));
      throw error;
    }
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException(t('users.roleNotFound', { id }));
    if (dto.permissions) assertKnownPermissions(dto.permissions);

    // The protected role is the way back in when everything else is misconfigured.
    if (role.isProtected && dto.permissions) {
      throw new BadRequestException(t('users.protectedRolePermissionsLocked', { label: role.label }));
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.permissions !== undefined ? { permissions: serializePermissions(dto.permissions) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return { ...updated, permissions: parsePermissions(updated.permissions) };
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException(t('users.roleNotFound', { id }));
    if (role.isProtected) throw new BadRequestException(t('users.protectedRoleCannotDelete', { label: role.label }));
    if (role._count.users > 0) {
      throw new ConflictException(t('users.roleInUse', { count: role._count.users, label: role.label }));
    }
    await this.prisma.role.delete({ where: { id } });
    return { id, deleted: true };
  }

  // -------------------------------------------------------------- internals

  /**
   * Refuses to remove the last account that can still manage users. Without
   * this, one click can leave the factory with no way to create accounts,
   * reset passwords, or reach its own settings — recoverable only by editing
   * the database by hand.
   */
  private async assertNotLastAdministrator(excludingUserId: string) {
    const admins = await this.prisma.user.findMany({
      where: { active: true, id: { not: excludingUserId } },
      include: { role: true },
    });
    const stillAdministrable = admins.some((u) => parsePermissions(u.role.permissions).includes('users:manage'));
    if (!stillAdministrable) {
      throw new BadRequestException(t('users.lastAdministrator'));
    }
  }

  /** Never returns passwordHash. The type makes it impossible to leak by accident. */
  private toPublic(user: {
    id: string;
    login: string;
    fullName: string;
    active: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    role: { id: string; key: string; label: string; permissions: string };
  }) {
    return {
      id: user.id,
      login: user.login,
      fullName: user.fullName,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role: { id: user.role.id, key: user.role.key, label: user.role.label },
      permissions: parsePermissions(user.role.permissions),
    };
  }
}

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

function assertKnownPermissions(permissions: string[]) {
  const unknown = unknownPermissions(permissions);
  if (unknown.length > 0) {
    throw new BadRequestException(t('users.unknownPermissions', { names: unknown.join(', ') }));
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}
