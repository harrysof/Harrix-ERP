import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PurchasingService, type PoFilters } from './purchasing.service.js';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  SetPoStatusDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  /** §13's supplier detail page: info, supplied items, POs, receipts, totals. */
  @Get('suppliers/:id')
  @RequirePermissions(PERMISSIONS.PURCHASING_READ)
  supplierDetail(@Param('id') id: string) {
    return this.purchasing.getSupplierDetail(id);
  }

  @Get('orders')
  @RequirePermissions(PERMISSIONS.PURCHASING_READ)
  list(@Query() filters: PoFilters) {
    return this.purchasing.list(filters);
  }

  @Post('orders')
  @RequirePermissions(PERMISSIONS.PURCHASING_WRITE)
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchasing.create(dto);
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.PURCHASING_READ)
  findOne(@Param('id') id: string) {
    return this.purchasing.findOne(id);
  }

  @Patch('orders/:id')
  @RequirePermissions(PERMISSIONS.PURCHASING_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchasing.update(id, dto);
  }

  /** Approving or cancelling is a spending decision — its own permission. */
  @Patch('orders/:id/status')
  @RequirePermissions(PERMISSIONS.PURCHASING_APPROVE)
  setStatus(@Param('id') id: string, @Body() dto: SetPoStatusDto) {
    return this.purchasing.setStatus(id, dto);
  }

  /** Posting a delivery — the only thing here that moves stock. */
  @Post('orders/:id/receive')
  @RequirePermissions(PERMISSIONS.PURCHASING_WRITE)
  receive(@Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto) {
    return this.purchasing.receive(id, dto);
  }

  @Delete('orders/:id')
  @RequirePermissions(PERMISSIONS.PURCHASING_WRITE)
  remove(@Param('id') id: string) {
    return this.purchasing.remove(id);
  }
}
