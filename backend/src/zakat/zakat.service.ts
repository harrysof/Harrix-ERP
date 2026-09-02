import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { getItemQuantity, getItemValuation } from '../stock/stock-math.js';
import { orderTotals } from '../sales/sales-math.js';
import { GoldPriceService } from './gold-price.service.js';
import type { CreateZakatCalculationDto, UpdateZakatPaymentDto } from './dto/zakat-calculation.dto.js';
import {
  computeDueDate,
  computeZakatTotals,
  DEFAULT_ZAKAT_RATE,
  formatHijri,
  gregorianToHijri,
  paymentStatusOf,
  type ZakatMethodology,
} from './zakat-math.js';

@Injectable()
export class ZakatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goldPrice: GoldPriceService,
  ) {}

  // ------------------------------------------------------------- auto-pull

  /**
   * Figures pulled live from Stock and Ventes, recomputed fresh on every
   * call (never cached) so they're always current the moment stock or an
   * order changes. Used both to pre-fill the calculation form and to build
   * the automatic dashboard.
   */
  async getAutoPull() {
    const items = await this.prisma.item.findMany({ where: { archived: false }, include: { inventoryType: true } });
    const movements = await this.prisma.movement.findMany({ where: { itemId: { in: items.map((i) => i.id) } } });

    const stockValueOf = (item: (typeof items)[number]) => {
      const quantity = getItemQuantity(movements, item.id);
      return getItemValuation(movements, item.id, quantity, item.unitCost).stockValue ?? 0;
    };

    const finishedGoodsValue = round(
      items.filter((i) => i.inventoryType.key === 'finished-goods').reduce((sum, i) => sum + stockValueOf(i), 0),
    );
    const rawMaterialsValue = round(
      items.filter((i) => i.inventoryType.isProductionInput).reduce((sum, i) => sum + stockValueOf(i), 0),
    );

    // "Cash and bank" — this ERP keeps no treasury ledger, so the money the
    // business actually holds is approximated as revenue already collected:
    // every non-cancelled order marked PAID. Pre-fills the Banque field;
    // physical till cash (Caisse) has no ledger to pull from and stays manual.
    const paidOrders = await this.prisma.order.findMany({
      where: { paymentStatus: 'PAID', shipmentStatus: { not: 'CANCELLED' } },
      include: { lines: true },
    });
    const bankValue = round(paidOrders.reduce((sum, o) => sum + orderTotals(o.lines, o).total, 0));

    // Receivables — money owed AND already earned: goods shipped but not
    // yet paid. An unshipped order isn't a receivable yet, just a promise.
    const shippedUnpaidOrders = await this.prisma.order.findMany({
      where: { shipmentStatus: 'SHIPPED', paymentStatus: 'PENDING' },
      include: { lines: true },
    });
    const receivablesValue = round(shippedUnpaidOrders.reduce((sum, o) => sum + orderTotals(o.lines, o).total, 0));

    return { bankValue, finishedGoodsValue, rawMaterialsValue, receivablesValue, asOf: new Date().toISOString() };
  }

  /**
   * The fully-automatic dashboard figure: auto-pull + the current gold
   * price, with cash and deductions at zero (this ERP has no source for
   * either) — a live lower-bound estimate, not a substitute for doing a full
   * calculation. See PERMISSIONS.FINANCE_READ callers for who can see it.
   */
  async getLive() {
    const [pull, gold] = await Promise.all([this.getAutoPull(), this.goldPrice.getCurrent()]);
    const inputs = {
      cash: 0,
      bank: pull.bankValue,
      finishedGoodsValue: pull.finishedGoodsValue,
      rawMaterialsValue: pull.rawMaterialsValue,
      receivablesValue: pull.receivablesValue,
      otherAssets: 0,
      deductions: 0,
      goldPricePerGram: gold.pricePerGram,
      zakatRate: DEFAULT_ZAKAT_RATE,
    };
    const totals = computeZakatTotals(inputs);
    const dueDate = computeDueDate(new Date(), 'LUNAR');
    return {
      ...inputs,
      ...totals,
      asOf: pull.asOf,
      goldPrice: gold,
      dueDate: dueDate.toISOString(),
      dueDateHijriLabel: formatHijri(gregorianToHijri(dueDate)),
    };
  }

  // ------------------------------------------------------------ calculations

  async listCalculations() {
    const rows = await this.prisma.zakatCalculation.findMany({ orderBy: { calculationDate: 'desc' } });
    return rows.map(decorate);
  }

  /** The one calculation, if any, deliberately exported to the dashboard — see the `pinned` field's doc comment. */
  async getPinned() {
    const row = await this.prisma.zakatCalculation.findFirst({ where: { pinned: true } });
    return row ? decorate(row) : null;
  }

  async getCalculation(id: string) {
    const row = await this.requireCalculation(id);
    return decorate(row);
  }

  async createCalculation(dto: CreateZakatCalculationDto) {
    const row = await this.prisma.zakatCalculation.create({
      data: {
        calculationDate: new Date(dto.calculationDate),
        methodology: dto.methodology ?? 'LUNAR',
        goldPricePerGram: dto.goldPricePerGram,
        cash: dto.cash ?? 0,
        bank: dto.bank ?? 0,
        finishedGoodsValue: dto.finishedGoodsValue,
        rawMaterialsValue: dto.rawMaterialsValue,
        receivablesValue: dto.receivablesValue,
        otherAssets: dto.otherAssets ?? 0,
        deductions: dto.deductions ?? 0,
        zakatRate: dto.zakatRate ?? DEFAULT_ZAKAT_RATE,
        notes: dto.notes?.trim() || null,
      },
    });
    return decorate(row);
  }

  async updatePayment(id: string, dto: UpdateZakatPaymentDto) {
    await this.requireCalculation(id);
    const row = await this.prisma.zakatCalculation.update({
      where: { id },
      data: {
        ...(dto.amountPaid !== undefined ? { amountPaid: dto.amountPaid } : {}),
        ...(dto.paymentDate !== undefined ? { paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
    return decorate(row);
  }

  async deleteCalculation(id: string) {
    await this.requireCalculation(id);
    await this.prisma.zakatCalculation.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Exports one calculation to the dashboard — a deliberate action, not
   * automatic on save (see the `pinned` field's doc comment). At most one
   * calculation is pinned at a time; pinning another one unpins the last.
   */
  async pinCalculation(id: string) {
    await this.requireCalculation(id);
    await this.prisma.$transaction([
      this.prisma.zakatCalculation.updateMany({ where: { pinned: true }, data: { pinned: false } }),
      this.prisma.zakatCalculation.update({ where: { id }, data: { pinned: true } }),
    ]);
    return this.getCalculation(id);
  }

  async unpinCalculation(id: string) {
    await this.requireCalculation(id);
    await this.prisma.zakatCalculation.update({ where: { id }, data: { pinned: false } });
    return this.getCalculation(id);
  }

  private async requireCalculation(id: string) {
    const row = await this.prisma.zakatCalculation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Calcul de Zakat introuvable : ${id}`);
    return row;
  }
}

interface ZakatCalculationRow {
  id: string;
  calculationDate: Date;
  methodology: string;
  goldPricePerGram: number;
  cash: number;
  bank: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  receivablesValue: number;
  otherAssets: number;
  deductions: number;
  zakatRate: number;
  amountPaid: number;
  paymentDate: Date | null;
  notes: string | null;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Attaches every derived figure — computed on every read, never stored. See zakat-math.ts. */
function decorate(row: ZakatCalculationRow) {
  const methodology = row.methodology as ZakatMethodology;
  const totals = computeZakatTotals(row);
  const dueDate = computeDueDate(row.calculationDate, methodology);
  return {
    ...row,
    ...totals,
    dueDate: dueDate.toISOString(),
    dueDateHijriLabel: formatHijri(gregorianToHijri(dueDate)),
    calculationHijriLabel: formatHijri(gregorianToHijri(row.calculationDate)),
    remaining: round(Math.max(0, totals.zakatDue - row.amountPaid)),
    paymentStatus: paymentStatusOf(totals.zakatDue, row.amountPaid),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
