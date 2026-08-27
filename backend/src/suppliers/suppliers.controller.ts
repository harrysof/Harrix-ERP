import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.suppliers.list(includeArchived === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliers.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.suppliers.setArchived(id, true);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.suppliers.setArchived(id, false);
  }
}
