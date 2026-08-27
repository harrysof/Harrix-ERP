import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StockService } from './stock.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { ReceiveStockDto } from './dto/receive-stock.dto.js';
import { LogUsageDto } from './dto/log-usage.dto.js';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('summary')
  getSummary() {
    return this.stock.getSummary();
  }

  @Get('items')
  listItems(@Query('inventoryTypeId') inventoryTypeId?: string, @Query('includeArchived') includeArchived?: string) {
    return this.stock.listItems(inventoryTypeId, includeArchived === 'true');
  }

  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.stock.createItem(dto);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.stock.getItem(id);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.stock.updateItem(id, dto);
  }

  @Patch('items/:id/archive')
  archiveItem(@Param('id') id: string) {
    return this.stock.setItemArchived(id, true);
  }

  @Patch('items/:id/unarchive')
  unarchiveItem(@Param('id') id: string) {
    return this.stock.setItemArchived(id, false);
  }

  @Get('items/:id/batches')
  listBatches(@Param('id') id: string) {
    return this.stock.listBatches(id);
  }

  @Get('items/:id/movements')
  listMovements(@Param('id') id: string) {
    return this.stock.listMovements(id);
  }

  @Post('items/:id/receive')
  receive(@Param('id') id: string, @Body() dto: ReceiveStockDto) {
    return this.stock.receive(id, dto);
  }

  @Post('items/:id/usage')
  logUsage(@Param('id') id: string, @Body() dto: LogUsageDto) {
    return this.stock.logUsage(id, dto);
  }
}
