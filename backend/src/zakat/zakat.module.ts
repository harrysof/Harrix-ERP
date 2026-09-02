import { Module } from '@nestjs/common';
import { ZakatController } from './zakat.controller.js';
import { ZakatService } from './zakat.service.js';
import { GoldPriceService } from './gold-price.service.js';

@Module({
  controllers: [ZakatController],
  providers: [ZakatService, GoldPriceService],
})
export class ZakatModule {}
