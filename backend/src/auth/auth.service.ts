import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { parsePermissions } from './permissions.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser } from './current-user.js';

/** Work factor for password hashing. 12 is ~250ms on the factory PC — slow on purpose. */
export const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Verifies credentials and issues a token.
   *
   * Every failure returns the same message ("Identifiants incorrects"),
   * whether the login doesn't exist or the password is wrong. Telling the
   * difference would let anyone discover which logins are real.
   *
   * A deactivated account is the one exception: it says so, because that's an
   * employee who needs to go ask the gérant rather than retype their password.
   */
  async login(dto: LoginDto) {
    const login = dto.login.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { login }, include: { role: true } });

    // Hash a dummy password when the user doesn't exist, so a missing login
    // and a wrong password take the same time to answer.
    const hash = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
    const passwordMatches = await bcrypt.compare(dto.password, hash);

    if (!user || !passwordMatches) {
      await this.recordFailedLogin(login);
      throw new UnauthorizedException('Identifiants incorrects.');
    }
    if (!user.active) {
      await this.recordFailedLogin(login);
      throw new UnauthorizedException('Ce compte a été désactivé. Contactez le gérant.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditEntry.create({
      data: {
        userId: user.id,
        userLogin: user.login,
        action: 'LOGIN',
        entity: 'session',
        entityId: user.id,
        method: 'POST',
        path: '/auth/login',
      },
    });

    return {
      accessToken: await this.signToken(user.id),
      user: this.toProfile(user),
    };
  }

  /** The shape both /auth/login and /auth/me return, so the frontend has one type. */
  toProfile(user: { id: string; login: string; fullName: string; role: { key: string; label: string; permissions: string } }) {
    return {
      id: user.id,
      login: user.login,
      fullName: user.fullName,
      role: { key: user.role.key, label: user.role.label },
      permissions: parsePermissions(user.role.permissions),
    };
  }

  async getProfile(user: AuthenticatedUser) {
    const found = await this.prisma.user.findUnique({ where: { id: user.id }, include: { role: true } });
    if (!found) throw new UnauthorizedException('Compte introuvable.');
    return this.toProfile(found);
  }

  /**
   * Lets someone change their own password. Requires the current one, so a
   * walk-up at an unlocked screen can't lock the real owner out.
   */
  async changeOwnPassword(user: AuthenticatedUser, currentPassword: string, newPassword: string) {
    const found = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!found) throw new UnauthorizedException('Compte introuvable.');

    if (!(await bcrypt.compare(currentPassword, found.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return { changed: true };
  }

  private signToken(userId: string) {
    // A factory shift is 8 hours; 12 means nobody is logged out mid-shift,
    // and nobody stays logged in overnight on a shared floor terminal.
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '12h';
    return this.jwt.signAsync(
      { sub: userId },
      { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn } as Parameters<JwtService['signAsync']>[1],
    );
  }

  /**
   * Failed logins are recorded too. Someone trying passwords at 2am is
   * exactly what the audit log is for — and the row is written whether or not
   * the login exists, so the log doesn't itself reveal which names are real.
   */
  private async recordFailedLogin(login: string) {
    await this.prisma.auditEntry.create({
      data: {
        userId: null,
        userLogin: login,
        action: 'LOGIN_FAILED',
        entity: 'session',
        method: 'POST',
        path: '/auth/login',
      },
    });
  }
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}
