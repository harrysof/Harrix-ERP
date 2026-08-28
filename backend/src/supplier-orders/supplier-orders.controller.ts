import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SupplierOrdersService } from './supplier-orders.service.js';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto.js';
import { ReceiveSupplierOrderDto } from './dto/receive-supplier-order.dto.js';

@Controller('supplier-orders')
export class SupplierOrdersController {
  constructor(private readonly service: SupplierOrdersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateSupplierOrderDto) {
    return this.service.create(dto);
  }

  @Post(':id/receive')
  receive(@Param('id') id: string, @Body() dto: ReceiveSupplierOrderDto) {
    return this.service.receive(id, dto);
  }
}