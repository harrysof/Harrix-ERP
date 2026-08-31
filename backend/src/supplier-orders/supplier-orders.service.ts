import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto.js';
import { ReceiveSupplierOrderDto } from './dto/receive-supplier-order.dto.js';

@Injectable()
export class SupplierOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    supplier: true,
    lines: { include: { item: { include: { inventoryType: true } } } },
  };

  async list() {
    return this.prisma.supplierOrder.findMany({
      include: this.include,
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(id: string) {
    const order = await this.prisma.supplierOrder.findUnique({ where: { id }, include: this.include });
    if (!order) throw new NotFoundException(`Commande fournisseur introuvable : ${id}`);
    return order;
  }

  async create(dto: CreateSupplierOrderDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new BadRequestException(`Fournisseur introuvable : ${dto.supplierId}`);

    const itemIds = dto.lines.map((line) => line.itemId);
    const items = await this.prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true } });
    if (items.length !== itemIds.length) {
      throw new BadRequestException('Une ou plusieurs références de la commande sont introuvables.');
    }

    return this.prisma.supplierOrder.create({
      data: {
        supplierId: dto.supplierId,
        orderDate: new Date(dto.orderDate),
        status: 'open',
        notes: dto.notes ?? null,
        lines: {
          create: dto.lines.map((line) => ({
            itemId: line.itemId,
            quantityOrdered: line.quantityOrdered,
            unitCost: line.unitCost ?? null,
          })),
        },
      },
      include: this.include,
    });
  }

  /**
   * Records a full delivery for an order: stock enters the inventory as IN
   * movements (with a batch record per line for batch-tracked items) and the
   * order moves to "received". A single order cannot be partially delivered.
   */
  async receive(id: string, dto: ReceiveSupplierOrderDto) {
    const order = await this.get(id);
    if (order.status !== 'open') {
      throw new BadRequestException('Cette commande a déjà été réceptionnée.');
    }

    const detailsByLine = new Map((dto.lines ?? []).map((l) => [l.lineId, l]));
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      for (const line of order.lines) {
        const details = detailsByLine.get(line.id);
        const needsBatch = line.item.inventoryType.hasBatches;
        const needsExpiry = line.item.inventoryType.hasExpiry;

        if (needsBatch && !details?.batchNumber) {
          throw new BadRequestException(`Le numéro de lot est obligatoire pour "${line.item.name}".`);
        }
        if (needsExpiry && !details?.expiryDate) {
          throw new BadRequestException(`La date de péremption est obligatoire pour "${line.item.name}".`);
        }

        let batchId: string | null = null;
        if (needsBatch) {
          const batch = await tx.batch.create({
            data: {
              itemId: line.itemId,
              batchNumber: details!.batchNumber!,
              receivedDate: now,
              expiryDate: needsExpiry ? new Date(details!.expiryDate!) : null,
            },
          });
          batchId = batch.id;
          await tx.supplierOrderLine.update({
            where: { id: line.id },
            data: { batchNumber: details!.batchNumber, expiryDate: needsExpiry ? new Date(details!.expiryDate!) : null },
          });
        }

        await tx.movement.create({
          data: {
            itemId: line.itemId,
            batchId,
            direction: 'IN',
            quantity: line.quantityOrdered,
            date: now,
            supplierId: order.supplierId,
            // The agreed price if the order carried one, the article's
            // standard cost otherwise — so a delivery always brings its value
            // into the stock, and the item fiche can say which it was.
            unitCost: line.unitCost ?? line.item.unitCost ?? null,
            sourceType: 'SUPPLIER_ORDER',
            sourceRef: `Commande du ${order.orderDate.toISOString().slice(0, 10)}`,
          },
        });
      }

      await tx.supplierOrder.update({
        where: { id },
        data: { status: 'received', receivedDate: now },
      });

      return tx.supplierOrder.findUnique({ where: { id }, include: this.include });
    });
  }
}