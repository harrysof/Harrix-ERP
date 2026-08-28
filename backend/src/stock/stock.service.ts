import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { ReceiveStockDto } from './dto/receive-stock.dto.js';
import { LogUsageDto } from './dto/log-usage.dto.js';
import { getBatchesWithRemaining, getExpiryStatus, getFifoBatch, getItemQuantity, getLatestSupplier, getQualityCounts, getRecommendedBatch, getStockStatus, getUnaccounted, isLowStock, QUALITY_CLASSES, type BatchLike, type MovementDetail } from './stock-math.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(inventoryTypeId?: string, includeArchived = false) {
    const items = await this.prisma.item.findMany({
      where: {
        ...(inventoryTypeId ? { inventoryTypeId } : {}),
        ...(includeArchived ? {} : { archived: false }),
      },
      include: { inventoryType: true },
      orderBy: { name: 'asc' },
    });
    if (items.length === 0) return [];

    const movements = await this.prisma.movement.findMany({
      where: { itemId: { in: items.map((i) => i.id) } },
      include: { supplier: true },
    });
    const batches = await this.prisma.batch.findMany({
      where: { itemId: { in: items.map((i) => i.id) } },
    });
    const referenced = await this.findProductionReferences(items.map((i) => i.id));
    const today = new Date();

    return items.map((item) => {
      const view = this.buildItemView(item, movements, batches, today);
      return {
        ...view,
        deletable: !movements.some((m) => m.itemId === item.id) && !referenced.has(item.id),
      };
    });
  }

  async getItem(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id }, include: { inventoryType: true } });
    if (!item) throw new NotFoundException(`Article introuvable : ${id}`);
    const [movements, batches] = await Promise.all([
      this.prisma.movement.findMany({ where: { itemId: id }, include: { supplier: true } }),
      this.prisma.batch.findMany({ where: { itemId: id } }),
    ]);
    const referenced = await this.findProductionReferences([id]);
    const view = this.buildItemView(item, movements, batches, new Date());
    return {
      ...view,
      deletable: movements.length === 0 && !referenced.has(id),
    };
  }

  async listBatches(itemId: string) {
    await this.getItem(itemId);
    const [batches, movements] = await Promise.all([
      this.prisma.batch.findMany({ where: { itemId } }),
      this.prisma.movement.findMany({ where: { itemId } }),
    ]);
    return getBatchesWithRemaining(batches, movements, itemId, new Date());
  }

  async listMovements(itemId: string) {
    await this.getItem(itemId);
    return this.prisma.movement.findMany({
      where: { itemId },
      include: { batch: true, supplier: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createItem(dto: CreateItemDto) {
    const inventoryType = await this.prisma.inventoryType.findUnique({ where: { id: dto.inventoryTypeId } });
    if (!inventoryType) throw new BadRequestException(`Type d'inventaire inconnu : ${dto.inventoryTypeId}`);

    try {
      return await this.prisma.item.create({ data: dto });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Un article avec la référence "${dto.reference}" existe déjà.`);
      }
      throw error;
    }
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    await this.getItem(id);
    try {
      return await this.prisma.item.update({ where: { id }, data: dto });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Un article avec la référence "${dto.reference}" existe déjà.`);
      }
      throw error;
    }
  }

  async setItemArchived(id: string, archived: boolean) {
    await this.getItem(id);
    return this.prisma.item.update({ where: { id }, data: { archived } });
  }

  /**
   * Hard-delete an item — but ONLY one that has no history at all.
   *
   * The rule that an item is archived rather than deleted exists to protect
   * its movement ledger (see PROJECT_CONTEXT.md §4). An item with zero
   * movements and no production references has no ledger to protect, so
   * refusing to delete it was just friction: it left mistyped or unwanted
   * articles stuck in the list forever with no way out.
   *
   * Anything with history still can't be deleted, and says so.
   */
  async deleteItem(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Article introuvable : ${id}`);

    const movementCount = await this.prisma.movement.count({ where: { itemId: id } });
    if (movementCount > 0) {
      throw new ConflictException(
        `"${item.name}" a ${movementCount} mouvement(s) de stock et ne peut pas être supprimé — son historique serait orphelin. Archivez-le à la place.`,
      );
    }

    const referenced = await this.findProductionReferences([id]);
    if (referenced.has(id)) {
      throw new ConflictException(
        `"${item.name}" est utilisé par au moins un lot de production et ne peut pas être supprimé. Archivez-le à la place.`,
      );
    }

    // Batches with no movements are the item's own scaffolding, not history.
    await this.prisma.$transaction(async (tx) => {
      await tx.batch.deleteMany({ where: { itemId: id } });
      await tx.item.delete({ where: { id } });
    });

    return { id, deleted: true };
  }

  /** Item ids referenced by production, either as a product or as a consumed material. */
  private async findProductionReferences(itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set();
    const [consumed, produced] = await Promise.all([
      this.prisma.productionConsumption.findMany({ where: { itemId: { in: itemIds } }, select: { itemId: true } }),
      this.prisma.productionBatch.findMany({ where: { productItemId: { in: itemIds } }, select: { productItemId: true } }),
    ]);
    return new Set([...consumed.map((c) => c.itemId), ...produced.map((p) => p.productItemId)]);
  }

  async receive(itemId: string, dto: ReceiveStockDto) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId }, include: { inventoryType: true } });
    if (!item) throw new NotFoundException(`Article introuvable : ${itemId}`);

    if (item.inventoryType.hasBatches && !dto.batchNumber) {
      throw new BadRequestException('Le numéro de lot est obligatoire pour ce type de produit.');
    }
    if (item.inventoryType.hasExpiry && !dto.expiryDate) {
      throw new BadRequestException('La date de péremption est obligatoire pour ce type de produit.');
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw new BadRequestException(`Fournisseur introuvable : ${dto.supplierId}`);
    }
    const quality = validateQuality(dto.quality, item.inventoryType.hasQuality);

    return this.prisma.$transaction(async (tx) => {
      let batchId: string | null = null;
      if (dto.batchNumber) {
        const batch = await tx.batch.create({
          data: {
            itemId,
            batchNumber: dto.batchNumber,
            receivedDate: new Date(dto.date),
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          },
        });
        batchId = batch.id;
      }

      return tx.movement.create({
        data: {
          itemId,
          batchId,
          direction: 'IN',
          quantity: dto.quantity,
          date: new Date(dto.date),
          supplierId: dto.supplierId ?? null,
          quality,
        },
        include: { batch: true, supplier: true },
      });
    });
  }

  async logUsage(itemId: string, dto: LogUsageDto) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId }, include: { inventoryType: true } });
    if (!item) throw new NotFoundException(`Article introuvable : ${itemId}`);

    const movements = await this.prisma.movement.findMany({ where: { itemId } });

    if (item.inventoryType.hasBatches) {
      if (!dto.batchId) throw new BadRequestException('Choisissez un lot.');
      const batches = await this.prisma.batch.findMany({ where: { itemId } });
      const withRemaining = getBatchesWithRemaining(batches, movements, itemId, new Date());
      const batch = withRemaining.find((b) => b.id === dto.batchId);
      if (!batch) throw new BadRequestException(`Lot introuvable : ${dto.batchId}`);
      if (dto.quantity > batch.remaining) {
        throw new BadRequestException(`Il n'y a que ${batch.remaining} ${item.unit} disponible dans ce lot.`);
      }
    } else {
      const available = getItemQuantity(movements, itemId);
      if (dto.quantity > available) {
        throw new BadRequestException(`Il n'y a que ${available} ${item.unit} disponible.`);
      }
    }

    const quality = validateQuality(dto.quality, item.inventoryType.hasQuality);

    return this.prisma.movement.create({
      data: {
        itemId,
        batchId: item.inventoryType.hasBatches ? (dto.batchId ?? null) : null,
        direction: 'OUT',
        quantity: dto.quantity,
        date: new Date(dto.date),
        reason: dto.reason,
        quality,
        machine: dto.machine ?? null,
        maintenanceRef: dto.maintenanceRef ?? null,
        employee: dto.employee ?? null,
        notes: dto.notes ?? null,
      },
      include: { batch: true },
    });
  }

  /** Powers the Dashboard tab with a single call, per the build plan's Phase 9 "one endpoint" rule. */
  async getSummary() {
    const items = await this.prisma.item.findMany({ where: { archived: false }, include: { inventoryType: true } });
    const movements = await this.prisma.movement.findMany({ where: { itemId: { in: items.map((i) => i.id) } } });
    const batches = await this.prisma.batch.findMany({ where: { itemId: { in: items.map((i) => i.id) } } });
    const today = new Date();

    const lowStockItems = items
      .map((item) => ({ item, quantity: getItemQuantity(movements, item.id) }))
      .filter(({ item, quantity }) => isLowStock(quantity, item.reorderThreshold))
      .sort((a, b) => a.quantity - b.quantity)
      .map(({ item, quantity }) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity,
        reorderThreshold: item.reorderThreshold,
        inventoryTypeLabel: item.inventoryType.label,
      }));

    const watchBatches = batches.filter((b) => {
      const status = getExpiryStatus(b.expiryDate, today);
      return status === 'expired' || status === 'warning';
    });

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      watchBatchCount: watchBatches.length,
    };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}

/** Validate a production-quality tag against the item's type — returns the value to store (or null). */
function validateQuality(quality: string | undefined, hasQuality: boolean): string | null {
  if (!quality) return null;
  if (!hasQuality) {
    throw new BadRequestException('Ce type de produit ne classifie pas la qualité de production.');
  }
  if (!QUALITY_CLASSES.includes(quality as (typeof QUALITY_CLASSES)[number])) {
    throw new BadRequestException(`Classe de qualité inconnue : ${quality} (attendue : ${QUALITY_CLASSES.join(', ')})`);
  }
  return quality;
}
