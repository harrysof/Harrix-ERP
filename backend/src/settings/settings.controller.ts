import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { CreateInventoryTypeDto, UpdateInventoryTypeDto } from './dto/inventory-type.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

/**
 * The inventory-type list shapes almost every other screen, so any
 * authenticated user can read it — a stock clerk needs to know what "lot" and
 * "péremption" mean for their own tab. There is nothing sensitive here.
 *
 * Changing the list is another matter: it decides what every Stock screen
 * shows, so it takes stock:manage — the same permission as creating articles.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('inventory-types')
  listInventoryTypes() {
    return this.settings.listInventoryTypes();
  }

  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Post('inventory-types')
  createInventoryType(@Body() dto: CreateInventoryTypeDto) {
    return this.settings.createInventoryType(dto);
  }

  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Patch('inventory-types/:id')
  updateInventoryType(@Param('id') id: string, @Body() dto: UpdateInventoryTypeDto) {
    return this.settings.updateInventoryType(id, dto);
  }

  /** Only succeeds for an inventory with no articles at all. */
  @RequirePermissions(PERMISSIONS.STOCK_MANAGE)
  @Delete('inventory-types/:id')
  deleteInventoryType(@Param('id') id: string) {
    return this.settings.deleteInventoryType(id);
  }
}
