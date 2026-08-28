import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.suppliers.list(includeArchived === 'true');
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliers.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_WRITE)
  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_WRITE)
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.suppliers.setArchived(id, true);
  }

  @RequirePermissions(PERMISSIONS.SUPPLIERS_WRITE)
  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.suppliers.setArchived(id, false);
  }
}
