import { Module } from '@nestjs/common';
import { ZakatController } from './zakat.controller.js';
import { ZakatService } from './zakat.service.js';
import { GoldPriceService } from './gold-price.service.js';

@Module({
  controllers: [ZakatController],
  providers: [ZakatService, GoldPriceService],
  // Exported so the tableau de bord shows the same Zakat position this
  // module computes, rather than a second implementation of it.
  exports: [ZakatService],
})
export class ZakatModule {}
