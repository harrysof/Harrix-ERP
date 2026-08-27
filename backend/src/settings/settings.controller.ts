import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('inventory-types')
  listInventoryTypes() {
    return this.settings.listInventoryTypes();
  }
}
