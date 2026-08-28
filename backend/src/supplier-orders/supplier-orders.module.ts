import { Module } from '@nestjs/common';
import { SupplierOrdersController } from './supplier-orders.controller.js';
import { SupplierOrdersService } from './supplier-orders.service.js';

@Module({
  controllers: [SupplierOrdersController],
  providers: [SupplierOrdersService],
})
export class SupplierOrdersModule {}