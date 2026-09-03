import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { t } from '../i18n/messages/index.js';
import { ZakatService } from '../zakat/zakat.service.js';
import { getAverageUnitCost, getItemQuantity, getItemValuation } from '../stock/stock-math.js';
import { localizeInventoryType } from '../settings/inventory-type-i18n.js';
import { orderTotals } from '../sales/sales-math.js';
import { payEstimateOf } from '../hr/payroll-math.js';
import { PERMISSIONS, type Permission } from '../auth/permissions.js';
import {
  deltaRate,
  isMonthKey,
  monthKeyOf,
  monthLabel,
  monthRange,
  monthResult,
  monthShortLabel,
  monthsEndingAt,
  round,
  sumBy,
  topBy,
  type MonthKey,
} from './analytics-math.js';

/**
 * The tableau de bord, for one calendar month.
 *
 * Two rules shape this file.
 *
 * 1. Nothing is stored. Every figure below is recomputed from the ledgers on
 *    each call, the same rule as stock quantity, order totals and payroll —
 *    a dashboard that caches its own numbers is a dashboard that lies the
 *    day someone corrects an old movement.
 *
 * 2. Every section is gated by the caller's own permissions, and a section
 *    the caller may not see comes back as `null` rather than as zeros. A
 *    magasinier opening this page must not learn the payroll from a chart,
 *    and "0 DA" would be a worse answer than "you can't see this".
 *
 * The month itself is the only input. Sections that are genuinely a *stock*
 * rather than a *flow* (stock on hand, headcount, Zakat) say so in their own
 * field names and are as-of now, not as-of the month — a snapshot cannot be
 * reconstructed for a month that has already closed, and pretending
 * otherwise would be the one place this file invents a number.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zakat: ZakatService,
  ) {}

  async getDashboard(rawMonth: string | undefined, permissions: Permission[]) {
    const month = this.resolveMonth(rawMonth);
    const can = (p: Permission) => permissions.includes(p);

    const [availableMonths, sales, stock, materials, costs, hr, zakat] = await Promise.all([
      this.listActiveMonths(),
      can(PERMISSIONS.ORDERS_READ) ? this.salesSection(month) : null,
      can(PERMISSIONS.STOCK_READ) ? this.stockSection() : null,
      can(PERMISSIONS.STOCK_READ) ? this.materialsSection(month) : null,
      can(PERMISSIONS.FINANCE_READ) ? this.costsSection(month) : null,
      can(PERMISSIONS.HR_READ) ? this.hrSection(month) : null,
      can(PERMISSIONS.FINANCE_READ) ? this.zakatSection() : null,
    ]);

    // The result line needs revenue AND all three cost buckets. Anyone
    // missing a piece gets no bottom line at all rather than a partial one
    // that reads like a real profit.
    const canSeeResult = can(PERMISSIONS.ORDERS_READ) && can(PERMISSIONS.FINANCE_READ) && can(PERMISSIONS.HR_READ);
    const result =
      canSeeResult && sales && costs && hr
        ? monthResult({
            revenue: sales.revenue,
            materialCost: sales.materialCost,
            payrollCost: hr.payrollGross,
            factoryCost: costs.total,
          })
        : null;

    const trend = canSeeResult ? await this.trend(month) : null;

    return {
      month,
      monthLabel: monthLabel(month),
      availableMonths,
      generatedAt: new Date().toISOString(),
      result,
      trend,
      sales,
      stock,
      materials,
      costs,
      hr,
      zakat,
    };
  }

  // ------------------------------------------------------------------ month

  private resolveMonth(raw: string | undefined): MonthKey {
    if (!raw) return monthKeyOf(new Date());
    if (!isMonthKey(raw)) throw new BadRequestException(t('common.invalidMonth'));
    return raw;
  }

  /**
   * Months the factory actually did something in — what the picker offers, so
   * nobody pages back through empty 2019. The current month is always
   * included, even when nothing has happened in it yet: a dashboard that
   * cannot show "today" is broken on the 1st of every month.
   */
  private async listActiveMonths(): Promise<MonthKey[]> {
    const [orders, movements, factoryCosts] = await Promise.all([
      this.prisma.order.findMany({ select: { date: true } }),
      this.prisma.movement.findMany({ select: { date: true } }),
      this.prisma.factoryCost.findMany({ select: { date: true } }),
    ]);

    const months = new Set<MonthKey>([monthKeyOf(new Date())]);
    for (const row of [...orders, ...movements, ...factoryCosts]) months.add(monthKeyOf(row.date));
    return [...months].sort().reverse();
  }

  // ------------------------------------------------------------------ sales

  /**
   * What was sold in the month, and what those goods cost in materials.
   *
   * Revenue counts every non-cancelled order *dated* in the month, at its
   * computed total — invoiced, not collected. `collected` and `outstanding`
   * sit beside it because "we sold 4 M DA" and "4 M DA arrived" are different
   * facts and the factory needs both.
   *
   * Material cost is an ESTIMATE and is labelled as one everywhere it
   * surfaces: sale movements carry no unit cost of their own, so each line is
   * valued at its article's weighted-average cost across all its entries. It
   * covers raw materials only — no labour, no energy, no machine wear.
   */
  private async salesSection(month: MonthKey) {
    const { start, end } = monthRange(month);

    const orders = await this.prisma.order.findMany({
      where: { date: { gte: start, lt: end }, shipmentStatus: { not: 'CANCELLED' } },
      include: {
        lines: { include: { item: { select: { id: true, name: true, reference: true, unit: true } } } },
        customer: { select: { id: true, fullName: true } },
      },
    });

    const totalOf = (order: (typeof orders)[number]) => orderTotals(order.lines, order).total;

    const revenue = round(orders.reduce((sum, o) => sum + totalOf(o), 0));
    const collected = round(orders.reduce((sum, o) => sum + o.amountPaid, 0));
    const outstanding = round(
      orders
        .filter((o) => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PARTIAL')
        .reduce((sum, o) => sum + Math.max(0, totalOf(o) - o.amountPaid), 0),
    );

    const lines = orders.flatMap((o) => o.lines);
    const quantitySold = round(lines.reduce((sum, l) => sum + l.quantity, 0));

    // Average cost per sold article, computed once over that article's whole
    // movement history — not per order line, which would re-scan the ledger
    // for every line of every order in the month.
    const soldItemIds = [...new Set(lines.map((l) => l.itemId))];
    const costByItem = await this.averageCostByItem(soldItemIds);
    const materialCost = round(lines.reduce((sum, l) => sum + l.quantity * (costByItem.get(l.itemId) ?? 0), 0));
    const uncostedLines = lines.filter((l) => costByItem.get(l.itemId) == null).length;

    const byItem = sumBy(
      lines,
      (l) => l.itemId,
      (l) => Math.max(0, l.quantity * l.unitPrice - l.discount),
      (l) => ({
        name: l.item.name,
        reference: l.item.reference,
        unit: l.item.unit,
        quantity: 0,
      }),
    );
    // sumBy carries revenue in `value`; quantity is a second measure, so it
    // is accumulated alongside rather than by a second pass over the lines.
    for (const line of lines) {
      const bucket = byItem.find((b) => b.id === line.itemId);
      if (bucket) bucket.quantity = round(bucket.quantity + line.quantity);
    }

    const byCustomer = sumBy(
      orders,
      (o) => o.customerId,
      (o) => totalOf(o),
      (o) => ({ name: o.customer.fullName, orderCount: 0 }),
    );
    for (const order of orders) {
      const bucket = byCustomer.find((b) => b.id === order.customerId);
      if (bucket) bucket.orderCount += 1;
    }

    // Returns are dated by when the goods came back, which is not necessarily
    // the month the order was written — so they are counted on their own date.
    const returns = await this.prisma.orderReturn.findMany({
      where: { date: { gte: start, lt: end } },
      include: { lines: { include: { orderLine: true } } },
    });
    const returnedValue = round(
      returns.reduce(
        (sum, r) =>
          sum + r.lines.reduce((s, l) => s + Math.max(0, l.quantity * l.orderLine.unitPrice), 0),
        0,
      ),
    );
    const returnedQuantity = round(
      returns.reduce((sum, r) => sum + r.lines.reduce((s, l) => s + l.quantity, 0), 0),
    );

    return {
      revenue,
      collected,
      outstanding,
      orderCount: orders.length,
      shippedCount: orders.filter((o) => o.shipmentStatus === 'SHIPPED').length,
      quantitySold,
      averageOrderValue: orders.length > 0 ? round(revenue / orders.length) : 0,
      materialCost,
      /** Sold lines whose article has no known cost — the estimate's blind spot. */
      uncostedLines,
      returnedValue,
      returnedQuantity,
      topProducts: topBy(byItem, (b) => b.value, 6, (b) => b.name).map((b) => ({
        itemId: b.id,
        name: b.name,
        reference: b.reference,
        unit: b.unit,
        quantity: b.quantity,
        revenue: b.value,
      })),
      topProductsByQuantity: topBy(byItem, (b) => b.quantity, 6, (b) => b.name).map((b) => ({
        itemId: b.id,
        name: b.name,
        reference: b.reference,
        unit: b.unit,
        quantity: b.quantity,
        revenue: b.value,
      })),
      topCustomers: topBy(byCustomer, (b) => b.value, 5, (b) => b.name).map((b) => ({
        customerId: b.id,
        name: b.name,
        orderCount: b.orderCount,
        revenue: b.value,
      })),
    };
  }

  // ------------------------------------------------------------------ stock

  /**
   * Stock on hand — a snapshot, as of now, not as of the selected month. A
   * past month's stock level cannot be reconstructed from an append-only
   * ledger without replaying it, and a wrong figure here would be worse than
   * an honestly-dated one. The UI labels it "à l'instant".
   */
  private async stockSection() {
    const items = await this.prisma.item.findMany({
      where: { archived: false },
      include: { inventoryType: true },
    });
    const movements = await this.prisma.movement.findMany({
      where: { itemId: { in: items.map((i) => i.id) } },
    });

    let stockValue = 0;
    let lowStockCount = 0;
    const lowStockItems: Array<{
      id: string;
      name: string;
      reference: string;
      unit: string;
      quantity: number;
      reorderThreshold: number;
      inventoryTypeLabel: string;
    }> = [];
    const valueByType = new Map<string, { id: string; label: string; value: number; itemCount: number }>();

    for (const item of items) {
      const quantity = getItemQuantity(movements, item.id);
      const value = getItemValuation(movements, item.id, quantity, item.unitCost).stockValue ?? 0;
      stockValue += value;

      const bucket = valueByType.get(item.inventoryTypeId) ?? {
        id: item.inventoryTypeId,
        label: localizeInventoryType(item.inventoryType).label,
        value: 0,
        itemCount: 0,
      };
      bucket.value = round(bucket.value + value);
      bucket.itemCount += 1;
      valueByType.set(item.inventoryTypeId, bucket);

      if (quantity <= item.reorderThreshold) {
        lowStockCount += 1;
        lowStockItems.push({
          id: item.id,
          name: item.name,
          reference: item.reference,
          unit: item.unit,
          quantity: round(quantity),
          reorderThreshold: item.reorderThreshold,
          inventoryTypeLabel: localizeInventoryType(item.inventoryType).label,
        });
      }
    }

    return {
      asOf: new Date().toISOString(),
      totalItems: items.length,
      stockValue: round(stockValue),
      lowStockCount,
      lowStockItems: lowStockItems.sort((a, b) => a.quantity - b.quantity).slice(0, 6),
      valueByType: [...valueByType.values()].sort((a, b) => b.value - a.value),
    };
  }

  // -------------------------------------------------------------- materials

  /**
   * The matières premières league tables: what was bought, what was consumed,
   * and what is simply expensive. Bought and used are *flows* and belong to
   * the month; "most expensive" is a property of the article and is as-of now.
   */
  private async materialsSection(month: MonthKey) {
    const { start, end } = monthRange(month);

    const items = await this.prisma.item.findMany({
      where: { archived: false },
      include: { inventoryType: true },
    });
    const inputItems = items.filter((i) => i.inventoryType.isProductionInput);
    const inputIds = new Set(inputItems.map((i) => i.id));
    const byId = new Map(items.map((i) => [i.id, i]));

    const monthMovements = await this.prisma.movement.findMany({
      where: { date: { gte: start, lt: end }, itemId: { in: [...inputIds] } },
    });

    const meta = (itemId: string) => {
      const item = byId.get(itemId)!;
      return { name: item.name, reference: item.reference, unit: item.unit };
    };

    // Bought = everything that came IN except what production credited back
    // (that is manufactured output, not a purchase) and except returns.
    const bought = monthMovements.filter(
      (m) => m.direction === 'IN' && m.sourceType !== 'PRODUCTION' && m.sourceType !== 'SALE_RETURN',
    );
    const used = monthMovements.filter((m) => m.direction === 'OUT');

    const boughtByItem = sumBy(bought, (m) => m.itemId, (m) => m.quantity, (m) => meta(m.itemId));
    const boughtValueByItem = new Map(
      sumBy(
        bought,
        (m) => m.itemId,
        (m) => m.quantity * (m.unitCost ?? byId.get(m.itemId)?.unitCost ?? 0),
        () => ({}),
      ).map((b) => [b.id, b.value]),
    );
    const usedByItem = sumBy(used, (m) => m.itemId, (m) => m.quantity, (m) => meta(m.itemId));
    const usedValueByItem = new Map(
      sumBy(
        used,
        (m) => m.itemId,
        (m) => m.quantity * (m.unitCost ?? byId.get(m.itemId)?.unitCost ?? 0),
        () => ({}),
      ).map((b) => [b.id, b.value]),
    );

    // "Most expensive" needs each input's average cost over its whole
    // history, not just this month's entries.
    const costByItem = await this.averageCostByItem(inputItems.map((i) => i.id));
    const priced = inputItems
      .map((i) => ({ id: i.id, ...meta(i.id), value: costByItem.get(i.id) ?? 0 }))
      .filter((i) => i.value > 0);

    return {
      purchasedValue: round([...boughtValueByItem.values()].reduce((s, v) => s + v, 0)),
      consumedValue: round([...usedValueByItem.values()].reduce((s, v) => s + v, 0)),
      mostBought: topBy(boughtByItem, (b) => b.value, 5, (b) => b.name).map((b) => ({
        itemId: b.id,
        name: b.name,
        reference: b.reference,
        unit: b.unit,
        quantity: b.value,
        value: round(boughtValueByItem.get(b.id) ?? 0),
      })),
      mostUsed: topBy(usedByItem, (b) => b.value, 5, (b) => b.name).map((b) => ({
        itemId: b.id,
        name: b.name,
        reference: b.reference,
        unit: b.unit,
        quantity: b.value,
        value: round(usedValueByItem.get(b.id) ?? 0),
      })),
      mostExpensive: topBy(priced, (b) => b.value, 5, (b) => b.name).map((b) => ({
        itemId: b.id,
        name: b.name,
        reference: b.reference,
        unit: b.unit,
        unitCost: round(b.value),
      })),
    };
  }

  // ------------------------------------------------------------------ costs

  /**
   * The month's general operating costs (the FactoryCost ledger), plus what
   * was spent on stock. The two are reported side by side but never added:
   * buying stock converts cash into inventory, it does not consume it.
   */
  private async costsSection(month: MonthKey) {
    const { start, end } = monthRange(month);

    const costs = await this.prisma.factoryCost.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { amount: 'desc' },
    });

    const byLabel = sumBy(
      costs,
      (c) => c.label.trim().toLowerCase(),
      (c) => c.amount,
      (c) => ({ label: c.label.trim() }),
    );

    // Cash spent on stock this month: every priced entry that came in, at
    // what that entry actually cost. Production output is excluded — nothing
    // was bought to create it beyond the materials already counted here.
    const stockIns = await this.prisma.movement.findMany({
      where: {
        date: { gte: start, lt: end },
        direction: 'IN',
        sourceType: { notIn: ['PRODUCTION', 'SALE_RETURN'] },
      },
      include: { item: { select: { unitCost: true } } },
    });
    const purchases = round(
      stockIns.reduce((sum, m) => sum + m.quantity * (m.unitCost ?? m.item.unitCost ?? 0), 0),
    );

    const biggest = costs[0] ?? null;

    return {
      total: round(costs.reduce((sum, c) => sum + c.amount, 0)),
      entryCount: costs.length,
      purchases,
      biggest: biggest ? { id: biggest.id, label: biggest.label, amount: round(biggest.amount), date: biggest.date } : null,
      byLabel: topBy(byLabel, (b) => b.value, 6, (b) => b.label).map((b) => ({ label: b.label, amount: b.value })),
    };
  }

  // --------------------------------------------------------------------- hr

  /**
   * Payroll and attendance for the month.
   *
   * Payroll is the gross monthly wage bill of everyone on the books — a
   * standing commitment, not a per-month ledger (this ERP has no payslip
   * table). Archived employees are excluded; so is anyone hired after the
   * month ended, so looking back at March does not bill March for someone who
   * started in July.
   *
   * Hours ARE a ledger, so "who worked the most" is a real monthly figure.
   */
  private async hrSection(month: MonthKey) {
    const { start, end } = monthRange(month);

    const employees = await this.prisma.employee.findMany({
      where: { archived: false, hireDate: { lt: end } },
      select: { id: true, fullName: true, position: true, salary: true, hireDate: true },
    });

    const payroll = employees.map((e) => ({ ...e, pay: payEstimateOf(e.salary) }));
    const payrollGross = round(payroll.reduce((sum, e) => sum + e.pay.gross, 0));
    const payrollNet = round(payroll.reduce((sum, e) => sum + e.pay.net, 0));

    const [timeEntries, absences] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: { date: { gte: start, lt: end } },
        include: { employee: { select: { id: true, fullName: true, position: true } } },
      }),
      this.prisma.absence.findMany({
        where: { startDate: { lt: end }, endDate: { gte: start } },
        include: { employee: { select: { id: true, fullName: true } } },
      }),
    ]);

    const hoursByEmployee = sumBy(
      timeEntries,
      (t) => t.employeeId,
      (t) => t.hoursWorked,
      (t) => ({ name: t.employee.fullName, position: t.employee.position }),
    );

    // An absence can straddle the month boundary; only the days inside the
    // month are counted, so a two-week leave in late March does not also
    // show up as April absence.
    const absenceDays = absences.reduce((sum, a) => {
      const from = a.startDate < start ? start : a.startDate;
      const to = a.endDate < end ? a.endDate : new Date(end.getTime() - 86_400_000);
      const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
      return sum + Math.max(0, days);
    }, 0);

    return {
      headcount: employees.length,
      payrollGross,
      payrollNet,
      hoursWorked: round(timeEntries.reduce((sum, t) => sum + t.hoursWorked, 0)),
      absenceDays,
      topPaid: topBy(payroll, (e) => e.pay.gross, 5, (e) => e.fullName).map((e) => ({
        employeeId: e.id,
        name: e.fullName,
        position: e.position,
        gross: round(e.pay.gross),
        net: round(e.pay.net),
      })),
      topHours: topBy(hoursByEmployee, (b) => b.value, 5, (b) => b.name).map((b) => ({
        employeeId: b.id,
        name: b.name,
        position: b.position,
        hours: b.value,
      })),
    };
  }

  // ------------------------------------------------------------------ zakat

  /**
   * The Zakat position. Prefers the pinned calculation — a figure a human
   * deliberately committed to — and falls back to the live automatic
   * estimate, saying which one it gave back so the UI never presents an
   * estimate as a decision.
   */
  private async zakatSection() {
    const pinned = await this.zakat.getPinned();
    if (pinned) {
      return {
        source: 'pinned' as const,
        zakatDue: pinned.zakatDue,
        zakatableBase: pinned.zakatableBase,
        totalAssets: pinned.totalAssets,
        nisabValue: pinned.nisabValue,
        belowNisab: pinned.belowNisab,
        amountPaid: round(pinned.amountPaid),
        remaining: pinned.remaining,
        paymentStatus: pinned.paymentStatus,
        dueDate: pinned.dueDate,
        dueDateHijriLabel: pinned.dueDateHijriLabel,
        asOf: pinned.calculationDate.toISOString(),
      };
    }

    const live = await this.zakat.getLive();
    return {
      source: 'live' as const,
      zakatDue: live.zakatDue,
      zakatableBase: live.zakatableBase,
      totalAssets: live.totalAssets,
      nisabValue: live.nisabValue,
      belowNisab: live.belowNisab,
      amountPaid: 0,
      remaining: live.zakatDue,
      paymentStatus: 'PENDING' as const,
      dueDate: live.dueDate,
      dueDateHijriLabel: live.dueDateHijriLabel,
      asOf: live.asOf,
    };
  }

  // ------------------------------------------------------------------ trend

  /**
   * Twelve months of revenue, cost and result, for the chart under the KPIs.
   *
   * Payroll is the one bucket that cannot be replayed month by month: the
   * only wage figure this ERP holds is each employee's *current* salary. So
   * every month in the trend carries today's wage bill for the people who
   * were already hired then — honest about who was on the books, approximate
   * about what they earned. The chart's caption says so.
   */
  private async trend(month: MonthKey) {
    const months = monthsEndingAt(month, 12);
    const windowStart = monthRange(months[0]).start;
    const windowEnd = monthRange(months[months.length - 1]).end;

    const [orders, factoryCosts, employees] = await Promise.all([
      this.prisma.order.findMany({
        where: { date: { gte: windowStart, lt: windowEnd }, shipmentStatus: { not: 'CANCELLED' } },
        include: { lines: true },
      }),
      this.prisma.factoryCost.findMany({ where: { date: { gte: windowStart, lt: windowEnd } } }),
      this.prisma.employee.findMany({ where: { archived: false }, select: { salary: true, hireDate: true } }),
    ]);

    const soldItemIds = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.itemId)))];
    const costByItem = await this.averageCostByItem(soldItemIds);

    const points = months.map((key) => {
      const { start, end } = monthRange(key);
      const monthOrders = orders.filter((o) => o.date >= start && o.date < end);
      const revenue = round(monthOrders.reduce((sum, o) => sum + orderTotals(o.lines, o).total, 0));
      const materialCost = round(
        monthOrders
          .flatMap((o) => o.lines)
          .reduce((sum, l) => sum + l.quantity * (costByItem.get(l.itemId) ?? 0), 0),
      );
      const factoryCost = round(
        factoryCosts.filter((c) => c.date >= start && c.date < end).reduce((sum, c) => sum + c.amount, 0),
      );
      const payrollCost = round(
        employees.filter((e) => e.hireDate < end).reduce((sum, e) => sum + payEstimateOf(e.salary).gross, 0),
      );
      const quantity = round(monthOrders.flatMap((o) => o.lines).reduce((sum, l) => sum + l.quantity, 0));

      return {
        month: key,
        label: monthShortLabel(key),
        orderCount: monthOrders.length,
        quantity,
        ...monthResult({ revenue, materialCost, payrollCost, factoryCost }),
      };
    });

    // The headline deltas the KPI cards show, against the month before.
    const current = points[points.length - 1];
    const previous = points[points.length - 2];

    return {
      points,
      deltas: previous
        ? {
            revenue: deltaRate(current.revenue, previous.revenue),
            totalCost: deltaRate(current.totalCost, previous.totalCost),
            profit: deltaRate(current.profit, previous.profit),
            quantity: deltaRate(current.quantity, previous.quantity),
          }
        : null,
    };
  }

  // ----------------------------------------------------------------- shared

  /**
   * Weighted-average unit cost per article, over that article's entire
   * movement history — one query for the whole set rather than one per
   * article, because the dashboard asks this of every sold item at once.
   * Articles with no priced entry and no standard cost are simply absent from
   * the map, so callers can tell "costs nothing" from "cost unknown".
   */
  private async averageCostByItem(itemIds: string[]): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const [items, movements] = await Promise.all([
      this.prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, unitCost: true } }),
      this.prisma.movement.findMany({ where: { itemId: { in: itemIds } } }),
    ]);

    const map = new Map<string, number>();
    for (const item of items) {
      const average = getAverageUnitCost(movements, item.id, item.unitCost);
      if (average != null) map.set(item.id, average);
    }
    return map;
  }
}
