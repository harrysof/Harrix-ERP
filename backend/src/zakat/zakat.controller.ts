import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ZakatService } from './zakat.service.js';
import { GoldPriceService } from './gold-price.service.js';
import { CreateZakatCalculationDto, UpdateZakatPaymentDto } from './dto/zakat-calculation.dto.js';
import { SetGoldPriceDto } from './dto/gold-price.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('zakat')
export class ZakatController {
  constructor(
    private readonly zakat: ZakatService,
    private readonly goldPrice: GoldPriceService,
  ) {}

  // --- gold price ----------------------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('gold-price')
  getGoldPrice() {
    return this.goldPrice.getCurrent();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('gold-price/refresh')
  refreshGoldPrice() {
    return this.goldPrice.forceRefresh();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('gold-price/manual')
  setGoldPrice(@Body() dto: SetGoldPriceDto) {
    return this.goldPrice.setManual(dto.pricePerGram);
  }

  // --- auto-pull & live dashboard --------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('auto-pull')
  getAutoPull() {
    return this.zakat.getAutoPull();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('live')
  getLive() {
    return this.zakat.getLive();
  }

  // --- calculations ----------------------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('calculations')
  listCalculations() {
    return this.zakat.listCalculations();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('calculations/pinned')
  getPinned() {
    return this.zakat.getPinned();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('calculations/:id')
  getCalculation(@Param('id') id: string) {
    return this.zakat.getCalculation(id);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('calculations')
  createCalculation(@Body() dto: CreateZakatCalculationDto) {
    return this.zakat.createCalculation(dto);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Patch('calculations/:id/payment')
  updatePayment(@Param('id') id: string, @Body() dto: UpdateZakatPaymentDto) {
    return this.zakat.updatePayment(id, dto);
  }

  /** Exports this calculation to the dashboard — see ZakatCalculation.pinned's doc comment. */
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Patch('calculations/:id/pin')
  pinCalculation(@Param('id') id: string) {
    return this.zakat.pinCalculation(id);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Patch('calculations/:id/unpin')
  unpinCalculation(@Param('id') id: string) {
    return this.zakat.unpinCalculation(id);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Delete('calculations/:id')
  deleteCalculation(@Param('id') id: string) {
    return this.zakat.deleteCalculation(id);
  }
}
