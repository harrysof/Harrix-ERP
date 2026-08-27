import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  listInventoryTypes() {
    return this.prisma.inventoryType.findMany({ orderBy: { sortOrder: 'asc' } });
  }
}
