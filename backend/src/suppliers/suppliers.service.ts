import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { t } from '../i18n/messages/index.js';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeArchived: boolean) {
    return this.prisma.supplier.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(t('purchasing.supplierNotFound', { id }));
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async setArchived(id: string, archived: boolean) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { archived } });
  }
}
