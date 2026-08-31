import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CLOSED_PO_STATUSES,
  EDITABLE_PO_STATUSES,
  outstandingCommitment,
  outstandingForLine,
  poTotals,
  receivedForLine,
  RECEIVABLE_PO_STATUSES,
  round,
  statusAfterReceipt,
  type PoStatus,
} from './purchasing-math.js';
import type { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, ReceivePurchaseOrderDto, SetPoStatusDto } from './dto/purchase-order.dto.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

export interface PoFilters {
  supplierId?: string;
  status?: string;
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
    if (!po) throw new NotFoundException(`Bon de commande introuvable : ${id}`);
    return decorate(po);
  }

  /** §13's supplier detail page, in one call. */
  async getSupplierDetail(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException(`Fournisseur introuvable : ${supplierId}`);

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
        lastPurchaseDate: decorated[0]?.date ?? null,
      },
    };
  }

  // ---------------------------------------------------------------- writing

  async create(dto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new BadRequestException(`Fournisseur introuvable : ${dto.supplierId}`);
    if (supplier.archived) throw new BadRequestException(`Le fournisseur "${supplier.name}" est archivé.`);
    await this.assertItemsExist(dto.lines.map((l) => l.itemId));

    const code = dto.code ?? (await this.nextCode('BC', 'purchaseOrder', new Date(dto.date)));

    try {
      const created = await this.prisma.purchaseOrder.create({
        data: {
          code,
          supplierId: dto.supplierId,
          date: new Date(dto.date),
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          status: dto.status ?? 'DRAFT',
          shipping: dto.shipping ?? 0,
          discount: dto.discount ?? 0,
          taxRate: dto.taxRate ?? 0,
          notes: dto.notes ?? null,
          lines: { create: dto.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitCost: l.unitCost })) },
        },
      });
      return this.findOne(created.id);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictException(`Un bon de commande "${code}" existe déjà.`);
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
    if (!po) throw new NotFoundException(`Bon de commande introuvable : ${id}`);

    if (dto.lines) {
      if (!EDITABLE_PO_STATUSES.includes(po.status as PoStatus)) {
        throw new ConflictException(
          `Les lignes de ce bon de commande ne peuvent plus être modifiées (statut : ${po.status}). Créez un nouveau bon si nécessaire.`,
        );
      }
      await this.assertItemsExist(dto.lines.map((l) => l.itemId));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
          ...(dto.date ? { date: new Date(dto.date) } : {}),
          ...(dto.expectedDate !== undefined ? { expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null } : {}),
          ...(dto.shipping !== undefined ? { shipping: dto.shipping } : {}),
          ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
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
    if (!po) throw new NotFoundException(`Bon de commande introuvable : ${id}`);

    if (dto.status === 'RECEIVED' || dto.status === 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(
        'Ce statut est déterminé par les réceptions enregistrées. Enregistrez une réception plutôt que de changer le statut à la main.',
      );
    }
    if (po.status === 'RECEIVED' && dto.status !== 'CANCELLED') {
      throw new ConflictException('Ce bon de commande est entièrement reçu.');
    }
    if (dto.status === 'CANCELLED') {
      const received = po.lines.some((l) => receivedForLine(l.id, l.receiptLines) > 0);
      if (received) {
        throw new ConflictException(
          "Ce bon de commande a déjà des réceptions — il ne peut pas être annulé. Le stock reçu reste reçu.",
        );
      }
    }

    await this.prisma.purchaseOrder.update({ where: { id }, data: { status: dto.status } });
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
    if (!po) throw new NotFoundException(`Bon de commande introuvable : ${id}`);
    if (!RECEIVABLE_PO_STATUSES.includes(po.status as PoStatus)) {
      throw new ConflictException(
        `Un bon de commande au statut "${po.status}" ne peut pas être réceptionné. Approuvez-le d'abord.`,
      );
    }
    if (dto.lines.length === 0) throw new BadRequestException('Indiquez au moins une ligne reçue.');

    // Validate every line before opening the transaction, so a bad line fails
    // with a message naming the material instead of rolling back silently.
    const plans = dto.lines.map((line) => {
      const poLine = po.lines.find((l) => l.id === line.purchaseOrderLineId);
      if (!poLine) throw new BadRequestException(`Ligne de commande introuvable : ${line.purchaseOrderLineId}`);

      const stillOwed = outstandingForLine(poLine, poLine.receiptLines);
      if (line.quantity > stillOwed && !dto.allowOverDelivery) {
        throw new BadRequestException(
          `Il ne reste que ${stillOwed} ${poLine.item.unit} à recevoir pour "${poLine.item.name}". Cochez la sur-livraison si le fournisseur a livré davantage.`,
        );
      }

      const type = poLine.item.inventoryType;
      if (type.hasBatches && !line.batchNumber) {
        throw new BadRequestException(`Le numéro de lot est obligatoire pour "${poLine.item.name}".`);
      }
      if (type.hasExpiry && !line.expiryDate) {
        throw new BadRequestException(`La date de péremption est obligatoire pour "${poLine.item.name}".`);
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
    if (!po) throw new NotFoundException(`Bon de commande introuvable : ${id}`);
    if (po.receipts.length > 0) {
      throw new ConflictException('Ce bon de commande a des réceptions et ne peut pas être supprimé. Son historique doit rester.');
    }
    if (po.status !== 'DRAFT') {
      throw new ConflictException(`Seul un brouillon peut être supprimé. Annulez ce bon de commande à la place.`);
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { id, deleted: true };
  }

  // -------------------------------------------------------------- internals

  private async assertItemsExist(itemIds: string[]) {
    const unique = [...new Set(itemIds)];
    const items = await this.prisma.item.findMany({ where: { id: { in: unique } } });
    const missing = unique.filter((id) => !items.some((i) => i.id === id));
    if (missing.length > 0) throw new BadRequestException(`Article introuvable : ${missing.join(', ')}`);
    const archived = items.filter((i) => i.archived);
    if (archived.length > 0) {
      throw new BadRequestException(`Article archivé : ${archived.map((i) => i.name).join(', ')}`);
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

/** Attaches totals and per-line received/outstanding. Never stored. */
function decorate<
  T extends {
    shipping: number;
    discount: number;
    taxRate: number;
    lines: Array<{ id: string; quantity: number; unitCost: number; receiptLines: Array<{ purchaseOrderLineId: string; quantity: number }> }>;
  },
>(po: T) {
  const allReceiptLines = po.lines.flatMap((l) => l.receiptLines);
  return {
    ...po,
    lines: po.lines.map((line) => ({
      ...line,
      received: receivedForLine(line.id, allReceiptLines),
      outstanding: outstandingForLine(line, allReceiptLines),
      lineTotal: round(line.quantity * line.unitCost),
    })),
    totals: poTotals(po.lines, po),
  };
}

function buildWhere(filters: PoFilters) {
  const { supplierId, status, from, to } = filters;
  return {
    ...(supplierId ? { supplierId } : {}),
    ...(status ? { status } : {}),
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
