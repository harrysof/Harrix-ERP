import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SupplierOrdersService } from './supplier-orders.service.js';
import { CreateSupplierOrderDto } from './dto/create-supplier-order.dto.js';
import { ReceiveSupplierOrderDto } from './dto/receive-supplier-order.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

/**
 * Supplier deliveries. These endpoints carry the same weight as the Achats
 * module they feed: the list exposes negotiated unit costs, and receiving an
 * order writes IN movements that change both the quantity on hand and the
 * valuation of the stock. They are permissioned to match — reading needs
 * purchasing:read, and receiving needs stock:write, the same permission the
 * equivalent manual entry (POST /stock/items/:id/receive) already required.
 */
@Controller('supplier-orders')
@RequirePermissions(PERMISSIONS.PURCHASING_READ)
export class SupplierOrdersController {
  constructor(private readonly service: SupplierOrdersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASING_WRITE)
  create(@Body() dto: CreateSupplierOrderDto) {
    return this.service.create(dto);
  }

  /** Writes stock movements, so it takes the stock permission as well. */
  @Post(':id/receive')
  @RequirePermissions(PERMISSIONS.PURCHASING_WRITE, PERMISSIONS.STOCK_WRITE)
  receive(@Param('id') id: string, @Body() dto: ReceiveSupplierOrderDto) {
    return this.service.receive(id, dto);
  }
}
