import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StockService } from './stock.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { ReceiveStockDto } from './dto/receive-stock.dto.js';
import { LogUsageDto } from './dto/log-usage.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @Get('summary')
  getSummary() {
    return this.stock.getSummary();
  }

  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @Get('items')
  listItems(@Query('inventoryTypeId') inventoryTypeId?: string, @Query('includeArchived') includeArchived?: string) {
    return this.stock.listItems(inventoryTypeId, includeArchived === 'true');
  }

  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.stock.createItem(dto);
  }

  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.stock.getItem(id);
  }

  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.stock.updateItem(id, dto);
  }

  /** Only succeeds for an item with no movements and no production references. */
  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.stock.deleteItem(id);
  }

  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Patch('items/:id/archive')
  archiveItem(@Param('id') id: string) {
    return this.stock.setItemArchived(id, true);
  }

  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Patch('items/:id/unarchive')
  unarchiveItem(@Param('id') id: string) {
    return this.stock.setItemArchived(id, false);
  }

  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @Get('items/:id/batches')
  listBatches(@Param('id') id: string) {
    return this.stock.listBatches(id);
  }

  @RequirePermissions(PERMISSIONS.STOCK_READ)
  @Get('items/:id/movements')
  listMovements(@Param('id') id: string) {
    return this.stock.listMovements(id);
  }

  @RequirePermissions(PERMISSIONS.STOCK_WRITE)
  @Post('items/:id/receive')
  receive(@Param('id') id: string, @Body() dto: ReceiveStockDto) {
    return this.stock.receive(id, dto);
  }

  @RequirePermissions(PERMISSIONS.STOCK_WRITE)
  @Post('items/:id/usage')
  logUsage(@Param('id') id: string, @Body() dto: LogUsageDto) {
    return this.stock.logUsage(id, dto);
  }
}
