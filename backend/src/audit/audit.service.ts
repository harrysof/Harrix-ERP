import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
}
