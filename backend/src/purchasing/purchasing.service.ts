import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { t } from '../i18n/messages/index.js';
import {
  amountOwed,
  CLOSED_PO_STATUSES,
  EDITABLE_PO_STATUSES,
  outstandingCommitment,
  outstandingForLine,
  paymentStatusOf,
  poTotals,
  receivedForLine,
  RECEIVABLE_PO_STATUSES,
  round,
  statusAfterReceipt,
  type PoStatus,
} from './purchasing-math.js';
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  RecordPoPaymentDto,
  SetPoStatusDto,
} from './dto/purchase-order.dto.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

export interface PoFilters {
  supplierId?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
}

const PO_INCLUDE = {
  supplier: true,
  lines: { include: { item: { include: { inventoryType: true } }, receiptLines: true } },
  receipts: { include: { lines: true }, orderBy: { date: 'desc' as const } },
};

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- reading

  async list(filters: PoFilters = {}) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: buildWhere(filters),
      include: PO_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return orders.map((po) => decorate(po));
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: PO_INCLUDE });
    if (!po) throw new NotFoundException(t('purchasing.poNotFound', { id }));
    return decorate(po);
  }

  /** §13's supplier detail page, in one call. */
  async getSupplierDetail(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException(t('purchasing.supplierNotFound', { id: supplierId }));

    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId },
      include: PO_INCLUDE,
      orderBy: [{ date: 'desc' }],
    });
    const decorated = orders.map((po) => decorate(po));

    // Every IN movement ever attributed to this supplier — the real receiving
    // history, including receptions logged directly in the Stock tab before
    // purchase orders existed.
    const movements = await this.prisma.movement.findMany({
      where: { supplierId, direction: 'IN' },
      include: { item: { include: { inventoryType: true } }, batch: true },
      orderBy: { date: 'desc' },
      take: 200,
    });

    // What this supplier actually provides, learned from both POs and history
    // rather than maintained by hand — nobody keeps a catalogue up to date.
    const suppliedItems = new Map<string, { id: string; name: string; reference: string; unit: string; lastUnitCost: number | null; lastDate: Date | null }>();
    for (const po of decorated) {
      for (const line of po.lines) {
        const existing = suppliedItems.get(line.itemId);
        if (!existing || (existing.lastDate && po.date > existing.lastDate)) {
          suppliedItems.set(line.itemId, {
            id: line.item.id,
            name: line.item.name,
            reference: line.item.reference,
            unit: line.item.unit,
            lastUnitCost: line.unitCost,
            lastDate: po.date,
          });
        }
      }
    }
    for (const movement of movements) {
      if (!suppliedItems.has(movement.itemId)) {
        suppliedItems.set(movement.itemId, {
          id: movement.item.id,
          name: movement.item.name,
          reference: movement.item.reference,
          unit: movement.item.unit,
          lastUnitCost: null,
          lastDate: movement.date,
        });
      }
    }

    const receipts = decorated.flatMap((po) =>
      po.receipts.map((receipt) => ({
        id: receipt.id,
        code: receipt.code,
        date: receipt.date,
        deliveryNote: receipt.deliveryNote,
        purchaseOrderId: po.id,
        purchaseOrderCode: po.code,
        lineCount: receipt.lines.length,
        quantity: round(receipt.lines.reduce((sum, l) => sum + l.quantity, 0)),
      })),
    );

    const billed = decorated.filter((po) => po.status !== 'CANCELLED');

    return {
      supplier,
      suppliedItems: [...suppliedItems.values()].sort((a, b) => a.name.localeCompare(b.name)),
      purchaseOrders: decorated,
      receipts,
      movements,
      summary: {
        purchaseOrderCount: decorated.length,
        openPurchaseOrderCount: decorated.filter((po) => !CLOSED_PO_STATUSES.includes(po.status as PoStatus)).length,
        totalPurchased: round(billed.reduce((sum, po) => sum + po.totals.total, 0)),
        outstandingCommitment: outstandingCommitment(
          decorated.map((po) => ({
            status: po.status,
            lines: po.lines,
            receiptLines: po.lines.flatMap((l) => l.receiptLines),
          })),
        ),
        amountOwed: amountOwed(decorated),
        lastPurchaseDate: decorated[0]?.date ?? null,
      },
    };
  }

  // ---------------------------------------------------------------- writing

  async create(dto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new BadRequestException(t('purchasing.supplierNotFound', { id: dto.supplierId }));
    if (supplier.archived) throw new BadRequestException(t('purchasing.supplierArchived', { name: supplier.name }));
    await this.assertItemsExist(dto.lines.map((l) => l.itemId));
    assertDiscount(dto.discountType, dto.discount);

    const code = dto.code ?? (await this.nextCode('BC', 'purchaseOrder', new Date(dto.date)));

    const total = poTotals(dto.lines, dto).total;
    const amountPaid = dto.amountPaid ?? 0;
    if (amountPaid > total) {
      throw new BadRequestException(t('purchasing.depositExceedsTotal', { paid: amountPaid, total }));
    }

    try {
      const created = await this.prisma.purchaseOrder.create({
        data: {
          code,
          supplierId: dto.supplierId,
          date: new Date(dto.date),
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          status: dto.status ?? 'DRAFT',
          paymentStatus: paymentStatusOf(total, amountPaid),
          amountPaid,
          shipping: dto.shipping ?? 0,
          discount: dto.discount ?? 0,
          discountType: dto.discountType ?? 'FIXED',
          taxRate: dto.taxRate ?? 0,
          notes: dto.notes ?? null,
          lines: { create: dto.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitCost: l.unitCost })) },
        },
      });
      return this.findOne(created.id);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictException(t('purchasing.codeExists', { code }));
      throw error;
    }
  }

  /**
   * Edits a purchase order. Lines can only be replaced while the PO is still
   * DRAFT or SUBMITTED — once anything has been received against it, changing
   * what was ordered would make the receipts describe a document that no
   * longer exists.
   */
  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: { include: { receiptLines: true } } } });
    if (!po) throw new NotFoundException(t('purchasing.poNotFound', { id }));

    if (dto.lines) {
      if (!EDITABLE_PO_STATUSES.includes(po.status as PoStatus)) {
        throw new ConflictException(t('purchasing.linesNotEditable', { status: po.status }));
      }
      await this.assertItemsExist(dto.lines.map((l) => l.itemId));
    }
    assertDiscount(dto.discountType ?? po.discountType, dto.discount ?? po.discount);

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
          ...(dto.date ? { date: new Date(dto.date) } : {}),
          ...(dto.expectedDate !== undefined ? { expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null } : {}),
          ...(dto.shipping !== undefined ? { shipping: dto.shipping } : {}),
          ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
          ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
          ...(dto.taxRate !== undefined ? { taxRate: dto.taxRate } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });

      if (dto.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderLine.createMany({
          data: dto.lines.map((l) => ({ purchaseOrderId: id, itemId: l.itemId, quantity: l.quantity, unitCost: l.unitCost })),
        });
      }
    });

    return this.findOne(id);
  }

  /**
   * Moves a PO along its lifecycle. PARTIALLY_RECEIVED and RECEIVED are NOT
   * settable by hand — they are consequences of posting receipts, and letting
   * someone claim "received" without a delivery is exactly the kind of
   * untraceable shortcut this system exists to prevent.
   */
  async setStatus(id: string, dto: SetPoStatusDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: { include: { receiptLines: true } } } });
    if (!po) throw new NotFoundException(t('purchasing.poNotFound', { id }));

    if (dto.status === 'RECEIVED' || dto.status === 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(t('purchasing.statusFromReceipts'));
    }
    if (po.status === 'RECEIVED' && dto.status !== 'CANCELLED') {
      throw new ConflictException(t('purchasing.poFullyReceived'));
    }
    if (dto.status === 'CANCELLED') {
      const received = po.lines.some((l) => receivedForLine(l.id, l.receiptLines) > 0);
      if (received) {
        throw new ConflictException(t('purchasing.poHasReceiptsNoCancel'));
      }
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        // Cancelling the order also cancels what's owed on it — a voided PO
        // isn't a payable any more, the same way sales cancels both dimensions
        // together (see sales.service.ts's OrderDetailModal cancel action).
        ...(dto.status === 'CANCELLED' ? { paymentStatus: 'CANCELLED' } : {}),
      },
    });
    return this.findOne(id);
  }

  /**
   * Records a payment to the supplier — "half now, the rest later" — by
   * adding to amountPaid rather than typing a status directly, so amountPaid
   * and paymentStatus can never disagree (see purchasing-math.ts's
   * paymentStatusOf). Refused past the order total, same reasoning as
   * sales.service.ts's recordPayment.
   */
  async recordPayment(id: string, dto: RecordPoPaymentDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!po) throw new NotFoundException(t('purchasing.poNotFound', { id }));
    if (po.paymentStatus === 'CANCELLED') {
      throw new ConflictException(t('purchasing.poCancelledNoPayment'));
    }

    const total = poTotals(po.lines, po).total;
    const amountPaid = round(po.amountPaid + dto.amount);
    if (amountPaid > total) {
      const remaining = round(total - po.amountPaid);
      throw new BadRequestException(t('common.paymentExceedsBalance', { amount: dto.amount, remaining }));
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { amountPaid, paymentStatus: paymentStatusOf(total, amountPaid) },
    });
    return this.findOne(id);
  }

  /**
   * Post a delivery. THIS is what moves stock — creating or approving a PO
   * never does. In one transaction it writes the receipt, its lines, the IN
   * movements, the Batch rows for chemicals, and the PO's recomputed status.
   */
  async receive(id: string, dto: ReceivePurchaseOrderDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: { include: { item: { include: { inventoryType: true } }, receiptLines: true } } },
    });
    if (!po) throw new NotFoundException(t('purchasing.poNotFound', { id }));
    if (!RECEIVABLE_PO_STATUSES.includes(po.status as PoStatus)) {
      throw new ConflictException(t('purchasing.poNotReceivableStatus', { status: po.status }));
    }
    if (dto.lines.length === 0) throw new BadRequestException(t('purchasing.giveAtLeastOneLine'));

    // Validate every line before opening the transaction, so a bad line fails
    // with a message naming the material instead of rolling back silently.
    const plans = dto.lines.map((line) => {
      const poLine = po.lines.find((l) => l.id === line.purchaseOrderLineId);
      if (!poLine) throw new BadRequestException(t('purchasing.orderLineNotFound', { id: line.purchaseOrderLineId }));

      const stillOwed = outstandingForLine(poLine, poLine.receiptLines);
      if (line.quantity > stillOwed && !dto.allowOverDelivery) {
        throw new BadRequestException(t('purchasing.onlyOwedRemaining', { stillOwed, unit: poLine.item.unit, name: poLine.item.name }));
      }

      const type = poLine.item.inventoryType;
      if (type.hasBatches && !line.batchNumber) {
        throw new BadRequestException(t('common.lotNumberRequiredFor', { item: poLine.item.name }));
      }
      if (type.hasExpiry && !line.expiryDate) {
        throw new BadRequestException(t('common.expiryRequiredFor', { item: poLine.item.name }));
      }

      return { line, poLine };
    });

    const code = await this.nextCode('BR', 'receipt', new Date(dto.date));

    await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          code,
          purchaseOrderId: id,
          date: new Date(dto.date),
          deliveryNote: dto.deliveryNote ?? null,
          notes: dto.notes ?? null,
        },
      });

      for (const { line, poLine } of plans) {
        // For chemicals, the delivery is what carries the lot and expiry —
        // §14. One Batch per received line, exactly like stock's receive().
        let batchId: string | null = null;
        if (line.batchNumber) {
          const batch = await tx.batch.create({
            data: {
              itemId: poLine.itemId,
              batchNumber: line.batchNumber,
              receivedDate: new Date(dto.date),
              expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
            },
          });
          batchId = batch.id;
        }

        const movement = await tx.movement.create({
          data: {
            itemId: poLine.itemId,
            batchId,
            direction: 'IN',
            quantity: line.quantity,
            date: new Date(dto.date),
            supplierId: po.supplierId,
            // The price the order was actually placed at, carried onto the
            // ledger. This is what makes a delivery move the item's average
            // cost: the money arrives with the goods, not separately.
            unitCost: poLine.unitCost,
            sourceType: 'PURCHASE',
            sourceRef: po.code,
          },
        });

        await tx.receiptLine.create({
          data: {
            receiptId: receipt.id,
            purchaseOrderLineId: poLine.id,
            quantity: line.quantity,
            movementId: movement.id,
            batchId,
          },
        });
      }

      // Recompute the status from ALL receipt lines, including the ones just
      // written — never from what the caller claimed.
      const allReceiptLines = await tx.receiptLine.findMany({
        where: { purchaseOrderLine: { purchaseOrderId: id } },
        select: { purchaseOrderLineId: true, quantity: true },
      });
      const nextStatus = statusAfterReceipt(po.status as PoStatus, po.lines, allReceiptLines);
      if (nextStatus !== po.status) {
        await tx.purchaseOrder.update({ where: { id }, data: { status: nextStatus } });
      }
    });

    return this.findOne(id);
  }

  /** Only an untouched draft can be deleted; anything else is cancelled. */
  async remove(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { receipts: true } });
    if (!po) throw new NotFoundException(t('purchasing.poNotFound', { id }));
    if (po.receipts.length > 0) {
      throw new ConflictException(t('purchasing.poHasReceiptsNoDelete'));
    }
    if (po.status !== 'DRAFT') {
      throw new ConflictException(t('purchasing.onlyDraftDeletable'));
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { id, deleted: true };
  }

  // -------------------------------------------------------------- internals

  private async assertItemsExist(itemIds: string[]) {
    const unique = [...new Set(itemIds)];
    const items = await this.prisma.item.findMany({ where: { id: { in: unique } } });
    const missing = unique.filter((id) => !items.some((i) => i.id === id));
    if (missing.length > 0) throw new BadRequestException(t('purchasing.itemNotFound', { ids: missing.join(', ') }));
    const archived = items.filter((i) => i.archived);
    if (archived.length > 0) {
      throw new BadRequestException(t('purchasing.itemArchived', { names: archived.map((i) => i.name).join(', ') }));
    }
  }

  /** "BC-2026-0007" / "BR-2026-0007" — sequential within the calendar year. */
  private async nextCode(prefix: string, model: 'purchaseOrder' | 'receipt', date: Date) {
    const year = date.getFullYear();
    const table = model === 'purchaseOrder' ? this.prisma.purchaseOrder : this.prisma.receipt;
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
 * A PERCENT discount is typed as a fraction, same rule as taxRate — DTO
 * decorators can't compare it against the sibling discountType field, so
 * that half of the check happens here.
 */
function assertDiscount(discountType: string | undefined, discount: number | undefined): void {
  if (discountType === 'PERCENT' && (discount ?? 0) > 1) {
    throw new BadRequestException(t('common.discountRateFraction'));
  }
}

/** Attaches totals and per-line received/outstanding. Never stored. */
function decorate<
  T extends {
    shipping: number;
    discount: number;
    taxRate: number;
    amountPaid: number;
    lines: Array<{ id: string; quantity: number; unitCost: number; receiptLines: Array<{ purchaseOrderLineId: string; quantity: number }> }>;
  },
>(po: T) {
  const allReceiptLines = po.lines.flatMap((l) => l.receiptLines);
  const totals = poTotals(po.lines, po);
  return {
    ...po,
    lines: po.lines.map((line) => ({
      ...line,
      received: receivedForLine(line.id, allReceiptLines),
      outstanding: outstandingForLine(line, allReceiptLines),
      lineTotal: round(line.quantity * line.unitCost),
    })),
    totals,
    /** What's still owed to the supplier, in DZD — total minus amountPaid, never negative. */
    balanceDue: round(Math.max(0, totals.total - po.amountPaid)),
  };
}

function buildWhere(filters: PoFilters) {
  const { supplierId, status, paymentStatus, from, to } = filters;
  return {
    ...(supplierId ? { supplierId } : {}),
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to.slice(0, 10)}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}
