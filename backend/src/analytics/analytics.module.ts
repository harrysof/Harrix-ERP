import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { ZakatModule } from '../zakat/zakat.module.js';

/**
 * Imports ZakatModule rather than re-deriving the Zakat position: the
 * dashboard shows the same figure the ZAKATI screen does, and two
 * implementations of it would eventually disagree.
 */
@Module({
  imports: [ZakatModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
