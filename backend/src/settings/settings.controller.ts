import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service.js';

/**
 * The inventory-type list shapes almost every other screen, so any
 * authenticated user can read it — a stock clerk needs to know what "lot" and
 * "péremption" mean for their own tab. There is nothing sensitive here.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('inventory-types')
  listInventoryTypes() {
    return this.settings.listInventoryTypes();
  }
}
