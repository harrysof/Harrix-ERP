import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PERMISSIONS, type Permission } from '../auth/permissions.js';
import type { AuthenticatedUser } from '../auth/current-user.js';

export interface AuditFilters {
  userId?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: string;
}

/** Newest first, capped — the log grows forever and nobody reads page 40. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: AuditFilters) {
    const limit = Math.min(Number(filters.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    return this.prisma.auditEntry.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.entity ? { entity: filters.entity } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(`${filters.to.slice(0, 10)}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      include: { user: { select: { id: true, fullName: true, login: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Distinct values actually present, for the log screen's filter dropdowns. */
  async getFilterOptions() {
    const entries = await this.prisma.auditEntry.findMany({ select: { entity: true, action: true } });
    return {
      entities: [...new Set(entries.map((e) => e.entity))].sort(),
      actions: [...new Set(entries.map((e) => e.action))].sort(),
    };
  }

  /**
   * A lightweight activity feed for the topbar bell — unlike list() above,
   * this is open to any logged-in user (see AuditController's notifications
   * route), so it does its own filtering: only entities the caller's role
   * can actually open (NOTIFICATION_PERMISSION), never the caller's own
   * actions (nobody needs to be told what they just did), and never the
   * account-security entities (auth/session/password) — those belong to the
   * full journal, which stays audit:read-only.
   */
  notifications(user: AuthenticatedUser) {
    const domains = Object.entries(NOTIFICATION_PERMISSION)
      .filter(([, required]) => user.permissions.includes(required))
      .map(([domain]) => domain);
    if (domains.length === 0) return Promise.resolve([]);

    return this.prisma.auditEntry.findMany({
      where: {
        action: { in: NOTIFIABLE_ACTIONS },
        userId: { not: user.id },
        OR: domains.flatMap((d) => [{ entity: d }, { entity: { startsWith: `${d}/` } }]),
      },
      // `select`, not `include`: this route is open to every logged-in user,
      // so it returns only the six fields the bell actually renders. In
      // particular it does not hand out `userId` (an internal account id) or
      // `changes` (the submitted body, which for an HR edit is somebody's
      // salary). The full journal still returns both — it is audit:read only.
      select: {
        id: true,
        action: true,
        entity: true,
        userLogin: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATIONS_LIMIT,
    });
  }
}

const NOTIFIABLE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];
const NOTIFICATIONS_LIMIT = 20;

/**
 * Which permission lets a user be notified about an entity — keyed by the
 * entity's leading path segment (see audit.interceptor.ts's describeTarget,
 * e.g. "hr/employees" → "hr"). A domain absent from this table (auth,
 * session, audit itself) never produces a notification for anyone short of
 * the full journal.
 */
const NOTIFICATION_PERMISSION: Record<string, Permission> = {
  hr: PERMISSIONS.HR_READ,
  production: PERMISSIONS.PRODUCTION_READ,
  purchasing: PERMISSIONS.PURCHASING_READ,
  sales: PERMISSIONS.ORDERS_READ,
  stock: PERMISSIONS.STOCK_READ,
  settings: PERMISSIONS.STOCK_READ,
  'supplier-orders': PERMISSIONS.STOCK_READ,
  suppliers: PERMISSIONS.SUPPLIERS_READ,
  users: PERMISSIONS.USERS_MANAGE,
  finance: PERMISSIONS.FINANCE_READ,
  zakat: PERMISSIONS.FINANCE_READ,
};
