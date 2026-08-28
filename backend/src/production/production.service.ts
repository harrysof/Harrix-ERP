import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { getBatchesWithRemaining, getItemQuantity } from '../stock/stock-math.js';
import {
  getRates,
  getVariance,
  groupLosses,
  statusAfterOutput,
  summarizeLosses,
  TERMINAL_STATUSES,
  type OutputFigures,
  type ProductionStatus,
} from './production-math.js';
import type {
  AddConsumptionDto,
  ConsumptionLineDto,
  CreateBatchDto,
  DeclareOutputDto,
  UpdateBatchDto,
} from './dto/create-batch.dto.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

export interface BatchFilters {
  from?: string;
  to?: string;
  productItemId?: string;
  machine?: string;
  supervisor?: string;
  status?: string;
}

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- reading

  async listBatches(filters: BatchFilters = {}) {
    const batches = await this.prisma.productionBatch.findMany({
      where: buildWhere(filters),
      include: {
        product: { include: { inventoryType: true } },
        consumptions: { include: { item: true, stockBatch: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return batches.map((b) => decorate(b));
  }

  async getBatch(id: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: {
        product: { include: { inventoryType: true } },
        consumptions: { include: { item: true, stockBatch: true } },
      },
    });
    if (!batch) throw new NotFoundException(`Lot de production introuvable : ${id}`);
    return decorate(batch);
  }

  /**
   * Everything the "Pertes & rendement" view needs, in one call: overall
   * totals plus the same totals broken down by product, by machine and by
   * month. Losses are only useful next to each other — a waste rate means
   * nothing until you can see which machine owns it.
   */
  async getSummary(filters: BatchFilters = {}) {
    const batches = await this.prisma.productionBatch.findMany({
      where: buildWhere(filters),
      include: { product: true },
    });

    const declared = batches.filter((b) => b.outputDeclared);

    return {
      totals: summarizeLosses(batches),
      openInvestigations: batches.filter((b) => b.status === 'INVESTIGATION').length,
      runningBatches: batches.filter((b) => !TERMINAL_STATUSES.includes(b.status as ProductionStatus)).length,
      byProduct: groupLosses(
        declared,
        (b) => b.productItemId,
        (b) => b.product.name,
      ),
      byMachine: groupLosses(
        declared,
        (b) => b.machine,
        (b) => b.machine,
      ),
      byPeriod: groupLosses(
        declared,
        (b) => monthKey(b.date),
        (b) => monthKey(b.date),
      ).sort((a, b) => b.key.localeCompare(a.key)),
    };
  }

  /** The machines/supervisors already used, to populate the monitoring filters. */
  async getFilterOptions() {
    const batches = await this.prisma.productionBatch.findMany({
      select: { machine: true, supervisor: true, operator: true },
    });
    return {
      machines: distinct(batches.map((b) => b.machine)),
      supervisors: distinct(batches.map((b) => b.supervisor)),
      operators: distinct(batches.map((b) => b.operator)),
    };
  }

  // ---------------------------------------------------------------- writing

  /**
   * Create a production batch and, in the SAME transaction, consume its
   * materials and (optionally) credit its output to finished-goods stock.
   *
   * This is the fix for the partial-failure problem the frontend used to work
   * around by reporting which of its N separate calls had already landed
   * (PROJECT_CONTEXT.md §8.3): either the whole batch happens, or none of it
   * does and the stock is untouched.
   */
  async createBatch(dto: CreateBatchDto) {
    const product = await this.prisma.item.findUnique({
      where: { id: dto.productItemId },
      include: { inventoryType: true },
    });
    if (!product) throw new BadRequestException(`Produit introuvable : ${dto.productItemId}`);
    if (product.archived) throw new BadRequestException(`Le produit "${product.name}" est archivé.`);

    const lines = dto.consumptions ?? [];
    const plans = await this.planConsumption(
      lines,
      lines.map(() => dto.date),
    );

    const output = dto.output;
    const figures: OutputFigures = {
      expectedQuantity: output?.expectedQuantity ?? dto.expectedQuantity,
      firstChoice: output?.firstChoice ?? 0,
      secondChoice: output?.secondChoice ?? 0,
      waste: output?.waste ?? 0,
      outputDeclared: Boolean(output),
    };
    if (output) assertOutputFits(figures);

    const code = dto.code ?? (await this.nextCode(new Date(dto.date)));

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const batch = await tx.productionBatch.create({
          data: {
            code,
            date: new Date(dto.date),
            productItemId: dto.productItemId,
            machine: dto.machine,
            shift: dto.shift,
            supervisor: dto.supervisor ?? null,
            operator: dto.operator ?? null,
            startTime: dto.startTime ?? null,
            endTime: dto.endTime ?? null,
            expectedQuantity: figures.expectedQuantity,
            firstChoice: figures.firstChoice,
            secondChoice: figures.secondChoice,
            waste: figures.waste,
            outputDeclared: figures.outputDeclared,
            notes: dto.notes ?? null,
            varianceNote: output?.varianceNote ?? null,
            status: output
              ? statusAfterOutput(figures)
              : (dto.status ?? (lines.length > 0 ? 'IN_PROGRESS' : 'PLANNED')),
          },
        });

        await applyConsumption(tx, batch.id, plans);

        if (output && (output.creditStock ?? true)) {
          const movementId = await creditOutput(tx, product.id, figures, new Date(dto.date));
          if (movementId) {
            await tx.productionBatch.update({ where: { id: batch.id }, data: { outputMovementId: movementId } });
          }
        }

        return batch;
      });

      return this.getBatch(created.id);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Un lot de production nommé "${code}" existe déjà.`);
      }
      throw error;
    }
  }

  /** Metadata edits only — the output figures go through declareOutput instead. */
  async updateBatch(id: string, dto: UpdateBatchDto) {
    const existing = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Lot de production introuvable : ${id}`);

    const data: Record<string, unknown> = { ...dto };
    if (dto.date) data.date = new Date(dto.date);

    // A batch under investigation is closed by explaining the variance, not by
    // making the gap go away — so recompute the status from whatever the edit
    // leaves behind rather than trusting the old one.
    if (existing.outputDeclared) {
      const figures: OutputFigures = { ...existing, expectedQuantity: dto.expectedQuantity ?? existing.expectedQuantity };
      assertOutputFits(figures);
      const note = dto.varianceNote ?? existing.varianceNote;
      if (!dto.status) {
        data.status = getVariance(figures, Boolean(note)).needsInvestigation
          ? 'INVESTIGATION'
          : existing.status === 'INVESTIGATION'
            ? 'CLOSED'
            : existing.status;
      }
    }

    await this.prisma.productionBatch.update({ where: { id }, data });
    return this.getBatch(id);
  }

  /**
   * Add material consumption to an existing batch. This is the path the
   * worker's satellite app will use as a shift progresses, rather than
   * declaring everything at once at the end.
   */
  async addConsumption(id: string, dto: AddConsumptionDto) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException(`Lot de production introuvable : ${id}`);
    if (batch.status === 'CANCELLED') {
      throw new BadRequestException('Ce lot est annulé — aucune matière ne peut plus y être ajoutée.');
    }

    const date = dto.date ?? batch.date.toISOString();
    const plans = await this.planConsumption(
      dto.lines,
      dto.lines.map(() => date),
    );

    await this.prisma.$transaction(async (tx) => {
      await applyConsumption(tx, id, plans);
      if (batch.status === 'PLANNED') {
        await tx.productionBatch.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
      }
    });

    return this.getBatch(id);
  }

  /**
   * Declare what actually came off the machine. Credits 1st + 2nd choice to
   * finished-goods stock (waste is recorded but never becomes sellable) and
   * sets the batch to COMPLETED or INVESTIGATION depending on the variance.
   */
  async declareOutput(id: string, dto: DeclareOutputDto) {
    const batch = await this.prisma.productionBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException(`Lot de production introuvable : ${id}`);
    if (batch.outputDeclared) {
      throw new ConflictException('La sortie de ce lot a déjà été déclarée.');
    }
    if (batch.status === 'CANCELLED') {
      throw new BadRequestException('Ce lot est annulé — sa sortie ne peut pas être déclarée.');
    }

    const figures: OutputFigures = {
      expectedQuantity: dto.expectedQuantity ?? batch.expectedQuantity,
      firstChoice: dto.firstChoice,
      secondChoice: dto.secondChoice,
      waste: dto.waste,
      outputDeclared: true,
    };
    assertOutputFits(figures);

    await this.prisma.$transaction(async (tx) => {
      const movementId = (dto.creditStock ?? true) ? await creditOutput(tx, batch.productItemId, figures, batch.date) : null;
      await tx.productionBatch.update({
        where: { id },
        data: {
          ...figures,
          varianceNote: dto.varianceNote ?? null,
          status: statusAfterOutput(figures),
          ...(movementId ? { outputMovementId: movementId } : {}),
        },
      });
    });

    return this.getBatch(id);
  }

  // --------------------------------------------------------------- internals

  /**
   * Validate every consumption line against real availability BEFORE the
   * transaction opens, so a bad line fails with a message naming the material
   * instead of rolling back silently. Quantities claimed by earlier lines in
   * the same request are subtracted as we go — otherwise two lines drawing on
   * the same lot could each "fit" on their own and overdraw it together.
   */
  private async planConsumption(lines: ConsumptionLineDto[], dates: string[]): Promise<ConsumptionPlan[]> {
    if (lines.length === 0) return [];

    const itemIds = distinct(lines.map((l) => l.itemId));
    const [items, movements, stockBatches] = await Promise.all([
      this.prisma.item.findMany({ where: { id: { in: itemIds } }, include: { inventoryType: true } }),
      this.prisma.movement.findMany({ where: { itemId: { in: itemIds } } }),
      this.prisma.batch.findMany({ where: { itemId: { in: itemIds } } }),
    ]);
    const today = new Date();

    const claimed = new Map<string, number>();
    const claim = (key: string, quantity: number) => claimed.set(key, (claimed.get(key) ?? 0) + quantity);

    return lines.map((line, i) => {
      const item = items.find((it) => it.id === line.itemId);
      if (!item) throw new BadRequestException(`Matière introuvable : ${line.itemId}`);
      if (!item.inventoryType.isProductionInput) {
        throw new BadRequestException(`"${item.name}" n'est pas une matière de production.`);
      }

      if (item.inventoryType.hasBatches) {
        if (!line.stockBatchId) throw new BadRequestException(`Choisissez un lot pour "${item.name}".`);
        const withRemaining = getBatchesWithRemaining(stockBatches, movements, item.id, today);
        const stockBatch = withRemaining.find((b) => b.id === line.stockBatchId);
        if (!stockBatch) throw new BadRequestException(`Lot introuvable pour "${item.name}" : ${line.stockBatchId}`);
        const available = stockBatch.remaining - (claimed.get(line.stockBatchId) ?? 0);
        if (line.quantity > available) {
          throw new BadRequestException(
            `Il ne reste que ${available} ${item.unit} dans le lot ${stockBatch.batchNumber} de "${item.name}".`,
          );
        }
        claim(line.stockBatchId, line.quantity);
      } else {
        const available = getItemQuantity(movements, item.id) - (claimed.get(item.id) ?? 0);
        if (line.quantity > available) {
          throw new BadRequestException(`Il ne reste que ${available} ${item.unit} de "${item.name}".`);
        }
        claim(item.id, line.quantity);
      }

      return {
        itemId: item.id,
        stockBatchId: item.inventoryType.hasBatches ? (line.stockBatchId ?? null) : null,
        quantity: line.quantity,
        date: new Date(dates[i]),
      };
    });
  }

  /** "LOT-2026-0007" — sequential within the calendar year. */
  private async nextCode(date: Date) {
    const year = date.getFullYear();
    const last = await this.prisma.productionBatch.findFirst({
      where: { code: { startsWith: `LOT-${year}-` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const next = last ? Number(last.code.slice(-4)) + 1 : 1;
    return `LOT-${year}-${String(next).padStart(4, '0')}`;
  }
}

type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
type ConsumptionPlan = { itemId: string; stockBatchId: string | null; quantity: number; date: Date };

/** Write the OUT movements and the consumption lines that point back at them. */
async function applyConsumption(tx: TxClient, productionBatchId: string, plans: ConsumptionPlan[]) {
  for (const plan of plans) {
    const movement = await tx.movement.create({
      data: {
        itemId: plan.itemId,
        batchId: plan.stockBatchId,
        direction: 'OUT',
        quantity: plan.quantity,
        date: plan.date,
        reason: 'Production',
      },
    });
    await tx.productionConsumption.create({
      data: {
        productionBatchId,
        itemId: plan.itemId,
        stockBatchId: plan.stockBatchId,
        quantity: plan.quantity,
        movementId: movement.id,
      },
    });
  }
}

/** Credit 1st + 2nd choice to stock. Waste is recorded but never sellable. */
async function creditOutput(tx: TxClient, productItemId: string, figures: OutputFigures, date: Date) {
  const sellable = figures.firstChoice + figures.secondChoice;
  if (sellable <= 0) return null;
  const movement = await tx.movement.create({
    data: { itemId: productItemId, direction: 'IN', quantity: sellable, date },
  });
  return movement.id;
}

/** Attach the computed variance and rates. Never stored — see schema.prisma. */
function decorate<T extends OutputFigures & { varianceNote: string | null }>(batch: T) {
  return {
    ...batch,
    ...getVariance(batch, Boolean(batch.varianceNote)),
    rates: getRates(batch),
  };
}

function assertOutputFits(figures: OutputFigures) {
  const accounted = figures.firstChoice + figures.secondChoice + figures.waste;
  if (figures.expectedQuantity <= 0 && accounted > 0) {
    throw new BadRequestException('Indiquez la quantité annoncée par la machine avant de déclarer la sortie.');
  }
}

function buildWhere(filters: BatchFilters) {
  const { from, to, productItemId, machine, supervisor, status } = filters;
  return {
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to.slice(0, 10)}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(productItemId ? { productItemId } : {}),
    ...(machine ? { machine } : {}),
    ...(supervisor ? { supervisor } : {}),
    ...(status ? { status } : {}),
  };
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function distinct(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}
