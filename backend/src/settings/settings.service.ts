import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInventoryTypeDto, UpdateInventoryTypeDto } from './dto/inventory-type.dto.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  listInventoryTypes() {
    return this.prisma.inventoryType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  /**
   * Add an inventory beyond the four the factory started with — emballages,
   * consommables, outillage. The schema always allowed it (types are rows,
   * not an enum); this is the door.
   *
   * New types land after the existing ones unless a position is given, so
   * adding one never reshuffles the tabs people are used to.
   */
  async createInventoryType(dto: CreateInventoryTypeDto) {
    if (dto.hasExpiry && !dto.hasBatches) {
      throw new BadRequestException(
        'Une péremption se suit par lot : activez aussi le suivi par lot, sinon la date ne se rattacherait à rien.',
      );
    }

    const last = await this.prisma.inventoryType.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });

    try {
      return await this.prisma.inventoryType.create({
        data: {
          key: dto.key,
          label: dto.label,
          singular: dto.singular,
          description: dto.description ?? '',
          defaultUnit: dto.defaultUnit,
          hasBatches: dto.hasBatches ?? false,
          hasExpiry: dto.hasExpiry ?? false,
          isProductionInput: dto.isProductionInput ?? false,
          hasColor: dto.hasColor ?? false,
          hasSize: dto.hasSize ?? false,
          hasDescription: dto.hasDescription ?? false,
          hasMachineInfo: dto.hasMachineInfo ?? false,
          hasGender: dto.hasGender ?? false,
          hasPrice: dto.hasPrice ?? false,
          hasQuality: dto.hasQuality ?? false,
          sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Un type d'inventaire avec la clé "${dto.key}" existe déjà.`);
      }
      throw error;
    }
  }

  async updateInventoryType(id: string, dto: UpdateInventoryTypeDto) {
    const type = await this.prisma.inventoryType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException(`Type d'inventaire introuvable : ${id}`);

    const hasBatches = dto.hasBatches ?? type.hasBatches;
    const hasExpiry = dto.hasExpiry ?? type.hasExpiry;
    if (hasExpiry && !hasBatches) {
      throw new BadRequestException(
        'Une péremption se suit par lot : gardez le suivi par lot activé, sinon la date ne se rattacherait à rien.',
      );
    }

    // Turning batch tracking OFF for an inventory that already has lots would
    // hide stock the ledger still counts — the lots stay, but nothing would
    // show them. Refuse rather than quietly orphan them.
    if (type.hasBatches && !hasBatches) {
      const lots = await this.prisma.batch.count({ where: { item: { inventoryTypeId: id } } });
      if (lots > 0) {
        throw new ConflictException(
          `Ce type a déjà ${lots} lot(s) enregistré(s) — le suivi par lot ne peut plus être désactivé sans rendre ce stock invisible.`,
        );
      }
    }

    return this.prisma.inventoryType.update({ where: { id }, data: dto });
  }

  /**
   * Only an inventory nobody has put anything in can be removed. One with
   * articles keeps them: deleting the type would leave every article, lot and
   * movement pointing at nothing.
   */
  async deleteInventoryType(id: string) {
    const type = await this.prisma.inventoryType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException(`Type d'inventaire introuvable : ${id}`);

    const items = await this.prisma.item.count({ where: { inventoryTypeId: id } });
    if (items > 0) {
      throw new ConflictException(
        `"${type.label}" contient ${items} article(s) et ne peut pas être supprimé. Supprimez ou archivez d'abord ses articles.`,
      );
    }

    await this.prisma.inventoryType.delete({ where: { id } });
    return { id, deleted: true };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT;
}
