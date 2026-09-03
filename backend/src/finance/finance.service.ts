import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateFactoryCostDto } from './dto/factory-cost.dto.js';
import { t } from '../i18n/messages/index.js';

/**
 * §Finance's factory-costs ledger — general operating costs (rent,
 * electricity, indirect wages…) typed in with a label, an amount and a date,
 * the same free-form shape as the margin calculator's cost lines but
 * persisted so it accumulates month over month instead of resetting.
 */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listCosts(month: string) {
    const { start, end } = monthRange(month);
    const costs = await this.prisma.factoryCost.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return { month, total: round(costs.reduce((sum, c) => sum + c.amount, 0)), costs };
  }

  /** Every distinct month with at least one cost recorded — feeds the "copier depuis" picker. */
  async listMonthsWithCosts() {
    const rows = await this.prisma.factoryCost.findMany({ select: { date: true }, orderBy: { date: 'desc' } });
    return [...new Set(rows.map((r) => r.date.toISOString().slice(0, 7)))];
  }

  async createCost(dto: CreateFactoryCostDto) {
    return this.prisma.factoryCost.create({
      data: { label: dto.label.trim(), amount: dto.amount, date: new Date(dto.date) },
    });
  }

  async deleteCost(id: string) {
    const cost = await this.prisma.factoryCost.findUnique({ where: { id } });
    if (!cost) throw new NotFoundException(t('finance.costNotFound', { id }));
    await this.prisma.factoryCost.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Duplicates every cost of `from` into `to`, dated to the 1st of the
   * target month — a copied "loyer" or "électricité" doesn't carry a
   * meaningful day-of-month, and the 1st is always a valid date regardless
   * of which month it lands in.
   */
  async copyMonth(from: string, to: string) {
    if (from === to) throw new BadRequestException(t('finance.chooseDifferentMonth'));
    const source = await this.prisma.factoryCost.findMany({
      where: { date: { gte: monthRange(from).start, lt: monthRange(from).end } },
    });
    if (source.length === 0) throw new BadRequestException(t('finance.noCostsForMonth', { month: from }));

    const { start: toStart } = monthRange(to);
    await this.prisma.$transaction(
      source.map((c) => this.prisma.factoryCost.create({ data: { label: c.label, amount: c.amount, date: toStart } })),
    );
    return this.listCosts(to);
  }
}

function monthRange(month: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException(t('common.invalidMonth'));
  const [year, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(year, m - 1, 1)), end: new Date(Date.UTC(year, m, 1)) };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
