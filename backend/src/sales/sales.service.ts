import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { getItemQuantity } from '../stock/stock-math.js';
import {
  canCancel,
  canEdit,
  canReturn,
  canShip,
  lineTotal,
  orderTotals,
  paymentStatusOf,
  returnableForLine,
  returnedForLine,
  round,
  summarizeCustomer,
} from './sales-math.js';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import type {
  CreateOrderDto,
  UpdateOrderDto,
  RecordPaymentDto,
  ReturnOrderDto,
  SetOrderStatusDto,
  ShipOrderDto,
} from './dto/order.dto.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

export interface OrderFilters {
  customerId?: string;
  shipmentStatus?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  search?: string;
  includeArchived?: string;
}

const ORDER_INCLUDE = {
  customer: true,
  lines: { include: { item: { include: { inventoryType: true } }, returnLines: true } },
  returns: { include: { lines: true }, orderBy: { date: 'desc' as const } },
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------- customers

  async listCustomers(includeArchived: boolean) {
    const customers = await this.prisma.customer.findMany({
      where: includeArchived ? {} : { archived: false },
      include: { orders: { include: { lines: true } } },
      orderBy: [{ archived: 'asc' }, { fullName: 'asc' }],
    });
    return customers.map(({ orders, ...customer }) => ({ ...customer, ...summarizeCustomer(orders) }));
  }

  /** §19's customer detail: profile, order history, and the three summaries. */
  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { orders: { include: ORDER_INCLUDE, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] } },
    });
    if (!customer) throw new NotFoundException(`Client introuvable : ${id}`);

    const { orders, ...profile } = customer;
    return {
      ...profile,
      summary: summarizeCustomer(orders),
      orders: await this.withStockWarnings(orders),
    };
  }

  async createCustomer(dto: CreateCustomerDto) {
    const code = dto.code ?? (await this.nextCode('CLI', 'customer', new Date()));
    try {
      const customer = await this.prisma.customer.create({ data: { ...dto, code } });
      return { ...customer, orderCount: 0, totalPurchased: 0, outstandingBalance: 0 };
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictException(`Un client "${code}" existe déjà.`);
      throw error;
    }
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    await this.assertCustomerExists(id);
    await this.prisma.customer.update({ where: { id }, data: dto });
    return this.getCustomer(id);
  }

  /**
   * Archived, not deleted, once the customer has orders — an order must stay
   * attributable, the same rule as items and suppliers. A customer who never
   * ordered anything can be removed outright.
   */
  async setCustomerArchived(id: string, archived: boolean) {
    await this.assertCustomerExists(id);
    await this.prisma.customer.update({ where: { id }, data: { archived } });
    return this.getCustomer(id);
  }

  async removeCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, include: { orders: true } });
    if (!customer) throw new NotFoundException(`Client introuvable : ${id}`);
    if (customer.orders.length > 0) {
      throw new ConflictException(
        `${customer.fullName} a ${customer.orders.length} commande(s) et ne peut pas être supprimé — son historique serait orphelin. Archivez-le à la place.`,
      );
    }
    await this.prisma.customer.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------------------------------------------------------------- orders

  async listOrders(filters: OrderFilters = {}) {
    const orders = await this.prisma.order.findMany({
      where: buildOrderWhere(filters),
      include: ORDER_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return this.withStockWarnings(orders);
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    return (await this.withStockWarnings([order]))[0];
  }

  /**
   * Annotates unshipped orders with what they could NOT ship right now.
   *
   * A warning, never a block: the build plan is explicit that factories take
   * orders they intend to produce next week, so creating one is always
   * allowed. Shipping is where the shortage becomes a hard error, because you
   * cannot physically send goods you do not have.
   */
  private async withStockWarnings<
    T extends {
      shipping: number;
      discount: number;
      taxRate: number;
      shipmentStatus: string;
      amountPaid: number;
      lines: Array<{
        id: string;
        itemId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        item: { name: string; unit: string };
        returnLines: Array<{ orderLineId: string; quantity: number }>;
      }>;
    },
  >(orders: T[]) {
    const pending = orders.filter((o) => o.shipmentStatus === 'PENDING');
    const itemIds = [...new Set(pending.flatMap((o) => o.lines.map((l) => l.itemId)))];
    const movements =
      itemIds.length > 0 ? await this.prisma.movement.findMany({ where: { itemId: { in: itemIds } } }) : [];

    return orders.map((order) => {
      const decorated = decorateOrder(order);
      if (order.shipmentStatus !== 'PENDING') return { ...decorated, stockWarnings: [] };

      const warnings = order.lines
        .map((line) => {
          const available = getItemQuantity(movements, line.itemId);
          return available < line.quantity
            ? { itemId: line.itemId, itemName: line.item.name, unit: line.item.unit, required: line.quantity, available }
            : null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);

      return { ...decorated, stockWarnings: warnings };
    });
  }

  /**
   * Creates an order. Note what this does NOT do: move stock. An order is a
   * promise, not a shipment — the OUT movements are written by ship(), so a
   * pending order never makes finished goods disappear from the shelf.
   *
   * The delivery address is snapshotted from the customer here, so editing a
   * customer later never rewrites where a past order was sent.
   */
  async createOrder(dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new BadRequestException(`Client introuvable : ${dto.customerId}`);
    if (customer.archived) throw new BadRequestException(`Le client "${customer.fullName}" est archivé.`);
    await this.assertSellableItems(dto.lines.map((l) => l.itemId));
    assertDiscount(dto.discountType, dto.discount);

    const code = dto.code ?? (await this.nextCode('CMD', 'order', new Date(dto.date)));

    const total = orderTotals(dto.lines, dto).total;
    const amountPaid = dto.amountPaid ?? 0;
    if (amountPaid > total) {
      throw new BadRequestException(
        `Le paiement initial (${amountPaid} DZD) dépasse le total de la commande (${total} DZD).`,
      );
    }

    try {
      const created = await this.prisma.order.create({
        data: {
          code,
          customerId: dto.customerId,
          date: new Date(dto.date),
          shipmentStatus: dto.shipmentStatus ?? 'PENDING',
          paymentStatus: paymentStatusOf(total, amountPaid),
          amountPaid,
          shipping: dto.shipping ?? 0,
          discount: dto.discount ?? 0,
          discountType: dto.discountType ?? 'FIXED',
          taxRate: dto.taxRate ?? 0,
          notes: dto.notes ?? null,
          shipToName: dto.shipToName ?? customer.fullName,
          shipToPhone: dto.shipToPhone ?? customer.phone,
          shipToEmail: dto.shipToEmail ?? customer.email,
          shipToAddress: dto.shipToAddress ?? customer.address,
          shipToCity: dto.shipToCity ?? customer.city,
          shipToProvince: dto.shipToProvince ?? customer.province,
          shipToCountry: dto.shipToCountry ?? customer.country,
          shipToPostalCode: dto.shipToPostalCode ?? customer.postalCode,
          lines: {
            create: dto.lines.map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount ?? 0,
            })),
          },
        },
      });
      return this.getOrder(created.id);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictException(`Une commande "${code}" existe déjà.`);
      throw error;
    }
  }

  async updateOrder(id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    if (!canEdit(order)) {
      throw new ConflictException(
        `Une commande expédiée ou annulée ne peut plus être modifiée — ses lignes ont déjà bougé le stock.`,
      );
    }
    if (dto.lines) await this.assertSellableItems(dto.lines.map((l) => l.itemId));
    assertDiscount(dto.discountType ?? order.discountType, dto.discount ?? order.discount);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          ...(dto.customerId ? { customerId: dto.customerId } : {}),
          ...(dto.date ? { date: new Date(dto.date) } : {}),
          ...(dto.shipping !== undefined ? { shipping: dto.shipping } : {}),
          ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
          ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
          ...(dto.taxRate !== undefined ? { taxRate: dto.taxRate } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...pickShipTo(dto),
        },
      });

      if (dto.lines) {
        await tx.orderLine.deleteMany({ where: { orderId: id } });
        await tx.orderLine.createMany({
          data: dto.lines.map((l) => ({
            orderId: id,
            itemId: l.itemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount ?? 0,
          })),
        });
      }
    });

    return this.getOrder(id);
  }

  /**
   * Ship the order: THIS is what moves stock. One OUT movement per line,
   * written with the order in a single transaction, so a failure on line 3
   * cannot leave lines 1 and 2 already deducted.
   *
   * Availability is checked for every line before the transaction opens, so
   * the error names the product instead of rolling back silently.
   */
  async shipOrder(id: string, dto: ShipOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    if (!canShip(order)) {
      throw new ConflictException(
        order.shipmentStatus === 'SHIPPED' ? 'Cette commande est déjà expédiée.' : 'Cette commande est annulée.',
      );
    }
    if (order.lines.length === 0) throw new BadRequestException('Cette commande ne contient aucune ligne.');

    const date = new Date(dto.date ?? new Date().toISOString());
    const itemIds = [...new Set(order.lines.map((l) => l.itemId))];
    const movements = await this.prisma.movement.findMany({ where: { itemId: { in: itemIds } } });

    const claimed = new Map<string, number>();
    for (const line of order.lines) {
      const available = getItemQuantity(movements, line.itemId) - (claimed.get(line.itemId) ?? 0);
      if (line.quantity > available) {
        throw new BadRequestException(
          `Stock insuffisant pour "${line.item.name}" : ${available} ${line.item.unit} disponible(s), ${line.quantity} demandé(s).`,
        );
      }
      claimed.set(line.itemId, (claimed.get(line.itemId) ?? 0) + line.quantity);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        const movement = await tx.movement.create({
          data: {
            itemId: line.itemId,
            direction: 'OUT',
            quantity: line.quantity,
            date,
            reason: 'Vente',
          },
        });
        await tx.orderLine.update({ where: { id: line.id }, data: { movementId: movement.id } });
      }
      const total = orderTotals(order.lines, order).total;
      await tx.order.update({
        where: { id },
        data: {
          shipmentStatus: 'SHIPPED',
          shippedAt: date,
          ...(dto.markPaid ? { paymentStatus: 'PAID', amountPaid: total } : {}),
        },
      });
    });

    return this.getOrder(id);
  }

  /**
   * Post a return: THIS is what restores stock, mirroring how ship() is what
   * removes it. Deliberately independent of paymentStatus — see
   * OrderReturn's doc comment in schema.prisma for why the two are not the
   * same event. One IN movement per returned line, in a single transaction
   * with the OrderReturn record itself.
   */
  async returnOrder(id: string, dto: ReturnOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { lines: { include: { item: true, returnLines: true } } },
    });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    if (!canReturn(order)) {
      throw new ConflictException('Seule une commande expédiée peut faire l’objet d’un retour.');
    }
    if (dto.lines.length === 0) throw new BadRequestException('Indiquez au moins une ligne retournée.');

    // Validate every line before opening the transaction, so a bad line fails
    // with a message naming the product instead of rolling back silently.
    const plans = dto.lines.map((line) => {
      const orderLine = order.lines.find((l) => l.id === line.orderLineId);
      if (!orderLine) throw new BadRequestException(`Ligne de commande introuvable : ${line.orderLineId}`);

      const stillReturnable = returnableForLine(orderLine, orderLine.returnLines);
      if (line.quantity > stillReturnable) {
        throw new BadRequestException(
          `Il ne reste que ${stillReturnable} ${orderLine.item.unit} retournable(s) pour "${orderLine.item.name}".`,
        );
      }
      return { line, orderLine };
    });

    const date = new Date(dto.date);
    const code = await this.nextCode('RET', 'orderReturn', date);

    await this.prisma.$transaction(async (tx) => {
      const orderReturn = await tx.orderReturn.create({
        data: {
          code,
          orderId: id,
          date,
          reason: dto.reason ?? null,
          notes: dto.notes ?? null,
        },
      });

      for (const { line, orderLine } of plans) {
        const movement = await tx.movement.create({
          data: {
            itemId: orderLine.itemId,
            direction: 'IN',
            quantity: line.quantity,
            date,
            reason: dto.reason ?? 'Retour client',
            sourceType: 'SALE_RETURN',
            sourceRef: order.code,
          },
        });

        await tx.orderReturnLine.create({
          data: {
            returnId: orderReturn.id,
            orderLineId: orderLine.id,
            quantity: line.quantity,
            movementId: movement.id,
          },
        });
      }
    });

    return this.getOrder(id);
  }

  /**
   * Sets payment status, or cancels. Shipment status is NOT settable here —
   * shipping goes through ship() because it has to move stock.
   */
  async setOrderStatus(id: string, dto: SetOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);

    if (dto.shipmentStatus === 'SHIPPED') {
      throw new BadRequestException("Utilisez l'action « Expédier » : l'expédition doit décrémenter le stock.");
    }
    if (dto.shipmentStatus === 'CANCELLED' && !canCancel(order)) {
      throw new ConflictException(
        order.shipmentStatus === 'SHIPPED'
          ? 'Une commande expédiée ne peut pas être annulée — le stock est déjà sorti.'
          : 'Cette commande est déjà annulée.',
      );
    }
    if (dto.shipmentStatus === 'PENDING' && order.shipmentStatus === 'SHIPPED') {
      throw new ConflictException("Une commande expédiée ne peut pas revenir en attente.");
    }

    await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.shipmentStatus ? { shipmentStatus: dto.shipmentStatus } : {}),
        ...(dto.paymentStatus ? { paymentStatus: dto.paymentStatus } : {}),
      },
    });
    return this.getOrder(id);
  }

  /**
   * Records a payment against an order — "he can only pay half now, and the
   * rest later" — by adding to amountPaid rather than typing a status
   * directly, so amountPaid and paymentStatus can never disagree (see
   * sales-math.ts's paymentStatusOf). Refused past the order total: an
   * overpayment isn't owed money, it's a different problem (a refund, a
   * credit note) that this ledger-less model doesn't represent.
   */
  async recordPayment(id: string, dto: RecordPaymentDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { lines: true } });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    if (order.paymentStatus === 'CANCELLED') {
      throw new ConflictException('Cette commande est annulée — aucun paiement ne peut lui être associé.');
    }

    const total = orderTotals(order.lines, order).total;
    const amountPaid = round(order.amountPaid + dto.amount);
    if (amountPaid > total) {
      const remaining = round(total - order.amountPaid);
      throw new BadRequestException(
        `Ce paiement (${dto.amount} DZD) dépasse le solde restant dû (${remaining} DZD).`,
      );
    }

    await this.prisma.order.update({
      where: { id },
      data: { amountPaid, paymentStatus: paymentStatusOf(total, amountPaid) },
    });
    return this.getOrder(id);
  }

  /**
   * Archived, not deleted — the escape hatch for a shipped order, which
   * removeOrder() refuses since it has a stock trail. Any order can be
   * archived regardless of shipment/payment state; it only hides it from the
   * default list, the same rule as Customer.archived and Employee.archived.
   */
  async setOrderArchived(id: string, archived: boolean) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    await this.prisma.order.update({ where: { id }, data: { archived, archivedAt: archived ? new Date() : null } });
    return this.getOrder(id);
  }

  /** Only an unshipped order can be deleted; a shipped one has a stock trail. */
  async removeOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Commande introuvable : ${id}`);
    if (order.shipmentStatus === 'SHIPPED') {
      throw new ConflictException(
        'Une commande expédiée ne peut pas être supprimée — elle a généré des mouvements de stock. Son historique doit rester.',
      );
    }
    await this.prisma.order.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** §15's list header figures. */
  async getSummary(filters: OrderFilters = {}) {
    const orders = await this.prisma.order.findMany({ where: buildOrderWhere(filters), include: ORDER_INCLUDE });
    const live = orders.filter((o) => o.shipmentStatus !== 'CANCELLED' && o.paymentStatus !== 'CANCELLED');
    const totalOf = (o: (typeof live)[number]) => orderTotals(o.lines, o).total;

    return {
      orderCount: orders.length,
      pendingShipment: orders.filter((o) => o.shipmentStatus === 'PENDING').length,
      shipped: orders.filter((o) => o.shipmentStatus === 'SHIPPED').length,
      cancelled: orders.filter((o) => o.shipmentStatus === 'CANCELLED').length,
      // Chiffre d'affaires is money actually collected — an unpaid order is a
      // commitment, not revenue yet, however far along its shipment is. A
      // PARTIAL order contributes only what's actually been paid on it.
      revenue: round(live.reduce((sum, o) => sum + o.amountPaid, 0)),
      outstanding: round(
        live
          .filter((o) => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PARTIAL')
          .reduce((sum, o) => sum + Math.max(0, totalOf(o) - o.amountPaid), 0),
      ),
    };
  }

  // ------------------------------------------------------------- internals

  private async assertCustomerExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Client introuvable : ${id}`);
    return customer;
  }

  /** An order line must name a real, unarchived finished-goods item. */
  private async assertSellableItems(itemIds: string[]) {
    const unique = [...new Set(itemIds)];
    const items = await this.prisma.item.findMany({ where: { id: { in: unique } }, include: { inventoryType: true } });
    const missing = unique.filter((id) => !items.some((i) => i.id === id));
    if (missing.length > 0) throw new BadRequestException(`Produit introuvable : ${missing.join(', ')}`);

    const archived = items.filter((i) => i.archived);
    if (archived.length > 0) throw new BadRequestException(`Produit archivé : ${archived.map((i) => i.name).join(', ')}`);
  }

  private async nextCode(prefix: string, model: 'order' | 'customer' | 'orderReturn', date: Date) {
    const year = date.getFullYear();
    const table = model === 'order' ? this.prisma.order : model === 'customer' ? this.prisma.customer : this.prisma.orderReturn;
    const last = await (table as { findFirst: (args: unknown) => Promise<{ code: string } | null> }).findFirst({
      where: { code: { startsWith: `${prefix}-${year}-` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const next = last ? Number(last.code.slice(-4)) + 1 : 1;
    return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  }
}

/**
 * Attaches every computed figure — §16's "the user should not have to
 * manually calculate these totals", answered on the server so the invoice and
 * the list can never disagree about what an order is worth.
 */
function decorateOrder<
  T extends {
    shipping: number;
    discount: number;
    taxRate: number;
    shipmentStatus: string;
    amountPaid: number;
    lines: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      returnLines: Array<{ orderLineId: string; quantity: number }>;
    }>;
  },
>(order: T) {
  const orderCanReturn = canReturn(order);
  const totals = orderTotals(order.lines, order);
  return {
    ...order,
    lines: order.lines.map((line) => ({
      ...line,
      lineTotal: lineTotal(line),
      returned: returnedForLine(line.id, line.returnLines),
      returnable: orderCanReturn ? returnableForLine(line, line.returnLines) : 0,
    })),
    totals,
    /** What's still owed, in DZD — total minus amountPaid, never negative. */
    balanceDue: round(Math.max(0, totals.total - order.amountPaid)),
    canEdit: canEdit(order),
    canShip: canShip(order),
    canCancel: canCancel(order),
    canReturn: orderCanReturn,
  };
}

/**
 * A PERCENT discount is typed as a fraction, same rule as taxRate — DTO
 * decorators can't compare it against the sibling discountType field, so
 * that half of the check happens here.
 */
function assertDiscount(discountType: string | undefined, discount: number | undefined): void {
  if (discountType === 'PERCENT' && (discount ?? 0) > 1) {
    throw new BadRequestException(
      'La remise en pourcentage se saisit en fraction (0,10 pour 10 %), pas en pourcentage brut.',
    );
  }
}

function buildOrderWhere(filters: OrderFilters) {
  const { customerId, shipmentStatus, paymentStatus, from, to, search, includeArchived } = filters;
  return {
    ...(includeArchived === 'true' ? {} : { archived: false }),
    ...(customerId ? { customerId } : {}),
    ...(shipmentStatus ? { shipmentStatus } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to.slice(0, 10)}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    // §15 lists orders by number and by customer email, so both are searchable.
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { customer: { fullName: { contains: search } } },
            { customer: { email: { contains: search } } },
          ],
        }
      : {}),
  };
}

/** The eight snapshot address fields, only those actually supplied. */
function pickShipTo(dto: UpdateOrderDto): Record<string, string> {
  const keys = [
    'shipToName',
    'shipToPhone',
    'shipToEmail',
    'shipToAddress',
    'shipToCity',
    'shipToProvince',
    'shipToCountry',
    'shipToPostalCode',
  ] as const;
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = dto[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}
