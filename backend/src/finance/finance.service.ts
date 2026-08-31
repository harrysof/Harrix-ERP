import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { materialCostOf } from '../production/production.service.js';
import {
  buildPricing,
  buildRegister,
  isMonthKey,
  monthKeyOf,
  monthLabel,
  monthPeriod,
  monthsInRange,
  periodOfMonths,
  roundMoney,
  summariseProduction,
  type AllocationBasis,
  type MaterialOverrideLike,
  type ProducedBatchLike,
} from './finance-math.js';
import {
  CreateCostCategoryDto,
  CreateCostEntryDto,
  DuplicateMonthDto,
  PeriodQueryDto,
  SetMaterialOverrideDto,
  SetProductMarginDto,
  UpdateCostCategoryDto,
  UpdateCostEntryDto,
  UpdateFinanceSettingsDto,
} from './dto/finance.dto.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
const SETTINGS_ID = 'default';

/**
 * A margin above this is almost certainly "25" typed where 0.25 was meant.
 * Refused with a message that says so, rather than silently pricing a shoe at
 * 26 times its cost.
 */
const MAX_MARGIN = 10;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Period resolution
  // -------------------------------------------------------------------------

  /**
   * Every read takes the same period shape: one month by default (the
   * accounting unit), or an explicit range for a quarter or a year.
   *
   * Returns the months themselves, not just the bounds, because the
   * material-cost corrections are keyed per month and have to be looked up
   * one by one.
   */
  private resolvePeriod(query: PeriodQueryDto): { months: string[]; start: Date; end: Date } {
    const from = query.from ?? query.month ?? monthKeyOf(new Date());
    const to = query.to ?? query.month ?? from;

    if (!isMonthKey(from) || !isMonthKey(to)) {
      throw new BadRequestException('Période invalide : les mois doivent être au format AAAA-MM.');
    }

    const months = monthsInRange(from, to);
    if (months.length === 0) {
      throw new BadRequestException(`Période vide : ${monthLabel(to)} est antérieur à ${monthLabel(from)}.`);
    }
    if (months.length > 36) {
      throw new BadRequestException('Période trop longue : 36 mois au maximum.');
    }

    const { start, end } = periodOfMonths(months);
    return { months, start, end };
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  /** Upserted rather than seeded, so a fresh database is never missing it. */
  async getSettings() {
    return this.prisma.financeSetting.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
  }

  async updateSettings(dto: UpdateFinanceSettingsDto) {
    if (dto.defaultMargin != null && dto.defaultMargin > MAX_MARGIN) {
      throw new BadRequestException(
        `Marge invalide : ${dto.defaultMargin}. La marge s'exprime en fraction — 0,25 pour +25 %, pas 25.`,
      );
    }

    await this.getSettings();
    return this.prisma.financeSetting.update({ where: { id: SETTINGS_ID }, data: dto });
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  listCategories() {
    return this.prisma.costCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] });
  }

  async createCategory(dto: CreateCostCategoryDto) {
    const last = await this.prisma.costCategory.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    try {
      return await this.prisma.costCategory.create({
        data: {
          key: dto.key,
          label: dto.label,
          description: dto.description ?? '',
          nature: dto.nature,
          behavior: dto.behavior,
          // Only the seeded materials category is ever computed. A category
          // created from the UI is always one the accountant types into —
          // there is no second source of raw-material cost.
          isMaterials: false,
          isProtected: false,
          sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Une catégorie avec la clé "${dto.key}" existe déjà.`);
      }
      throw error;
    }
  }

  async updateCategory(id: string, dto: UpdateCostCategoryDto) {
    const category = await this.requireCategory(id);

    // The materials category is summed from production, and production
    // materials are by definition a direct, variable cost. Letting it be
    // reclassified would put the factory's largest cost into the overhead
    // pool and quietly inflate every product's absorbed share.
    if (category.isMaterials && (dto.nature != null || dto.behavior != null)) {
      throw new BadRequestException(
        "La catégorie des matières premières est calculée depuis la production : sa nature et son comportement ne peuvent pas être changés. Son intitulé, lui, est libre.",
      );
    }

    return this.prisma.costCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    const category = await this.requireCategory(id);

    if (category.isMaterials) {
      throw new ConflictException(
        'La catégorie des matières premières ne peut pas être supprimée : elle est alimentée par la production, pas par une saisie.',
      );
    }
    if (category.isProtected) {
      throw new ConflictException(`"${category.label}" fait partie des catégories de base et ne peut pas être supprimée.`);
    }

    const entries = await this.prisma.costEntry.count({ where: { categoryId: id } });
    if (entries > 0) {
      throw new ConflictException(
        `"${category.label}" contient ${entries} charge(s) enregistrée(s) et ne peut pas être supprimée. Déplacez-les vers une autre catégorie d'abord.`,
      );
    }

    await this.prisma.costCategory.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async requireCategory(id: string) {
    const category = await this.prisma.costCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Catégorie de coût introuvable : ${id}`);
    return category;
  }

  // -------------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------------

  async listEntries(query: PeriodQueryDto) {
    const { start, end } = this.resolvePeriod(query);
    return this.prisma.costEntry.findMany({
      where: { date: { gte: start, lt: end } },
      include: {
        category: { select: { id: true, key: true, label: true, nature: true, behavior: true } },
        productItem: { select: { id: true, name: true, reference: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createEntry(dto: CreateCostEntryDto) {
    const category = await this.requireCategory(dto.categoryId);
    this.refuseMaterialsEntry(category);
    await this.validateProduct(dto.productItemId ?? null);

    return this.prisma.costEntry.create({
      data: {
        categoryId: dto.categoryId,
        label: dto.label,
        amount: roundMoney(dto.amount),
        date: new Date(dto.date),
        productItemId: dto.productItemId ?? null,
        notes: dto.notes ?? null,
      },
      include: { category: true, productItem: { select: { id: true, name: true, reference: true } } },
    });
  }

  async updateEntry(id: string, dto: UpdateCostEntryDto) {
    const entry = await this.prisma.costEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Charge introuvable : ${id}`);

    if (dto.categoryId) this.refuseMaterialsEntry(await this.requireCategory(dto.categoryId));
    if (dto.productItemId !== undefined) await this.validateProduct(dto.productItemId ?? null);

    return this.prisma.costEntry.update({
      where: { id },
      data: {
        ...dto,
        amount: dto.amount != null ? roundMoney(dto.amount) : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        productItemId: dto.productItemId === undefined ? undefined : (dto.productItemId ?? null),
      },
      include: { category: true, productItem: { select: { id: true, name: true, reference: true } } },
    });
  }

  async deleteEntry(id: string) {
    const entry = await this.prisma.costEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Charge introuvable : ${id}`);
    await this.prisma.costEntry.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * The raw-material total is summed from what production consumed. Typing it
   * by hand would put two numbers claiming to be the same thing in the same
   * table — so the door is closed here, and the correction goes through
   * `setMaterialOverride`, which keeps the computed figure beside it.
   */
  private refuseMaterialsEntry(category: { isMaterials: boolean; label: string }) {
    if (!category.isMaterials) return;
    throw new BadRequestException(
      `"${category.label}" est calculée depuis la production et ne se saisit pas à la main. Pour la corriger, utilisez la correction du mois — la valeur calculée reste visible à côté.`,
    );
  }

  private async validateProduct(productItemId: string | null) {
    if (!productItemId) return;
    const item = await this.prisma.item.findUnique({ where: { id: productItemId }, select: { id: true } });
    if (!item) throw new NotFoundException(`Produit introuvable : ${productItemId}`);
  }

  /**
   * Copy one month's typed charges onto another month.
   *
   * Chosen over a recurrence rule on purpose: what lands in the target month
   * is ordinary rows the accountant can edit or delete one by one, and
   * nothing keeps generating anything behind his back. He runs it, he sees
   * the result, he adjusts the two lines that moved.
   */
  async duplicateMonth(dto: DuplicateMonthDto) {
    if (dto.from === dto.to) {
      throw new BadRequestException('Le mois source et le mois de destination sont identiques.');
    }

    const source = monthPeriod(dto.from);
    const target = monthPeriod(dto.to);

    const entries = await this.prisma.costEntry.findMany({
      where: { date: { gte: source.start, lt: source.end }, category: { isMaterials: false } },
      include: { category: { select: { behavior: true } } },
    });

    const copied = entries.filter((e) => !dto.fixedOnly || e.category.behavior === 'FIXED');
    if (copied.length === 0) {
      throw new BadRequestException(
        `Aucune charge à copier depuis ${monthLabel(dto.from)}${dto.fixedOnly ? ' (charges fixes uniquement)' : ''}.`,
      );
    }

    // The day of the month is kept where it exists — the rent falls on the
    // 5th in both months — and clamped when the target month is shorter, so a
    // charge dated the 31st never silently lands in the following month.
    const lastDay = new Date(target.end.getTime() - 1).getUTCDate();

    const created = await this.prisma.costEntry.createMany({
      data: copied.map((entry) => {
        const day = Math.min(entry.date.getUTCDate(), lastDay);
        return {
          categoryId: entry.categoryId,
          label: entry.label,
          amount: entry.amount,
          date: new Date(Date.UTC(target.start.getUTCFullYear(), target.start.getUTCMonth(), day)),
          productItemId: entry.productItemId,
          notes: entry.notes,
        };
      }),
    });

    return { from: dto.from, to: dto.to, created: created.count };
  }

  // -------------------------------------------------------------------------
  // The material-cost correction
  // -------------------------------------------------------------------------

  async setMaterialOverride(dto: SetMaterialOverrideDto) {
    return this.prisma.materialCostOverride.upsert({
      where: { month: dto.month },
      update: { amount: roundMoney(dto.amount), reason: dto.reason },
      create: { month: dto.month, amount: roundMoney(dto.amount), reason: dto.reason },
    });
  }

  async deleteMaterialOverride(month: string) {
    const override = await this.prisma.materialCostOverride.findUnique({ where: { month } });
    if (!override) throw new NotFoundException(`Aucune correction enregistrée pour ${monthLabel(month)}.`);
    await this.prisma.materialCostOverride.delete({ where: { month } });
    return { month, deleted: true };
  }

  // -------------------------------------------------------------------------
  // The overview — register + absorption + suggested prices, in one call
  // -------------------------------------------------------------------------

  /**
   * Everything the Finance tab renders, computed on read.
   *
   * Nothing here is stored: the material cost is summed from the
   * consumptions, the overhead share is divided on the spot, and the
   * suggested price falls out of the two. A period re-opened next year
   * recomputes from the same rows and gives the same answer — which is the
   * only reason a cost price is worth quoting at all.
   */
  async getOverview(query: PeriodQueryDto) {
    const { months, start, end } = this.resolvePeriod(query);

    const [settings, categories, entries, batches, overrides] = await Promise.all([
      this.getSettings(),
      this.listCategories(),
      this.prisma.costEntry.findMany({
        where: { date: { gte: start, lt: end } },
        select: { id: true, categoryId: true, amount: true, productItemId: true },
      }),
      // Only declared batches: until the output figures are in, a batch has
      // consumed materials but produced no countable units, and dividing by
      // them would invent a cost per unit out of nothing.
      this.prisma.productionBatch.findMany({
        where: { date: { gte: start, lt: end }, outputDeclared: true },
        select: {
          date: true,
          productItemId: true,
          firstChoice: true,
          secondChoice: true,
          consumptions: { select: { quantity: true, unitCost: true } },
        },
      }),
      this.prisma.materialCostOverride.findMany({ where: { month: { in: months } } }),
    ]);

    const produced: ProducedBatchLike[] = batches.map((batch) => ({
      productItemId: batch.productItemId,
      sellableQuantity: batch.firstChoice + batch.secondChoice,
      materialCost: materialCostOf(batch.consumptions),
      uncostedLineCount: batch.consumptions.filter((c) => c.unitCost == null).length,
    }));
    const production = summariseProduction(produced);

    // Corrections are per month, so a quarter is the sum of each month's
    // effective figure: the corrected amount where one was recorded, the
    // computed one everywhere else.
    const computedByMonth = new Map<string, number>();
    for (const batch of batches) {
      const key = monthKeyOf(batch.date);
      computedByMonth.set(key, (computedByMonth.get(key) ?? 0) + materialCostOf(batch.consumptions));
    }
    const overrideByMonth = new Map(overrides.map((o) => [o.month, o]));

    let effectiveMaterialCost = 0;
    for (const month of months) {
      const override = overrideByMonth.get(month);
      effectiveMaterialCost += override ? override.amount : (computedByMonth.get(month) ?? 0);
    }

    const materialOverride: MaterialOverrideLike | null =
      overrides.length > 0
        ? {
            amount: roundMoney(effectiveMaterialCost),
            reason: overrides
              .slice()
              .sort((a, b) => a.month.localeCompare(b.month))
              .map((o) => `${monthLabel(o.month)} — ${o.reason}`)
              .join(' · '),
          }
        : null;

    const register = buildRegister({
      categories,
      entries,
      materialCost: production.totalMaterialCost,
      uncostedLineCount: production.uncostedLineCount,
      override: materialOverride,
    });

    // The pricing catalogue: everything an inventory marks as carrying a sale
    // price (finished goods), plus anything actually produced in the period —
    // a product made but not yet flagged as sellable still cost money to make.
    const items = await this.prisma.item.findMany({
      where: {
        archived: false,
        OR: [{ inventoryType: { hasPrice: true } }, { id: { in: [...production.byProduct.keys()] } }],
      },
      select: { id: true, name: true, reference: true, unit: true, price: true, targetMargin: true, photoUrl: true },
      orderBy: { name: 'asc' },
    });

    const pricing = buildPricing({
      production,
      categories,
      entries,
      products: items,
      basis: settings.allocationBasis as AllocationBasis,
      defaultMargin: settings.defaultMargin,
      materialOverride,
    });

    const byId = new Map(items.map((item) => [item.id, item]));

    return {
      period: {
        months,
        from: months[0],
        to: months[months.length - 1],
        label: months.length === 1 ? monthLabel(months[0]) : `${monthLabel(months[0])} → ${monthLabel(months[months.length - 1])}`,
      },
      settings,
      register,
      production: {
        totalUnits: production.totalUnits,
        computedMaterialCost: production.totalMaterialCost,
        batchCount: batches.length,
        uncostedLineCount: production.uncostedLineCount,
      },
      allocation: pricing.allocation,
      // The product rows carry their identity alongside their numbers so the
      // table needs no second call to name what it is pricing.
      products: pricing.products.map((costing) => {
        const item = byId.get(costing.productItemId);
        return {
          ...costing,
          name: item?.name ?? 'Produit inconnu',
          reference: item?.reference ?? '',
          unit: item?.unit ?? '',
          photoUrl: item?.photoUrl ?? null,
        };
      }),
      warnings: [...register.warnings, ...pricing.warnings],
      overrides,
    };
  }

  /**
   * A product priced differently from the rest of the range — a premium model
   * the factory sells at +40 % while everything else runs at +25 %.
   */
  async setProductMargin(itemId: string, dto: SetProductMarginDto) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) throw new NotFoundException(`Produit introuvable : ${itemId}`);

    if (dto.targetMargin != null && dto.targetMargin > MAX_MARGIN) {
      throw new BadRequestException(
        `Marge invalide : ${dto.targetMargin}. La marge s'exprime en fraction — 0,25 pour +25 %, pas 25.`,
      );
    }

    return this.prisma.item.update({
      where: { id: itemId },
      data: { targetMargin: dto.targetMargin ?? null },
      select: { id: true, name: true, targetMargin: true },
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}
