import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductionService, type BatchFilters } from './production.service.js';
import { AddConsumptionDto, CreateBatchDto, DeclareOutputDto, UpdateBatchDto } from './dto/create-batch.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('production')
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  /** Loss & yield roll-up. Accepts the same filters as the batch list. */
  @RequirePermissions(PERMISSIONS.PRODUCTION_READ)
  @Get('summary')
  getSummary(@Query() filters: BatchFilters) {
    return this.production.getSummary(filters);
  }

  /** Distinct machines / supervisors / operators, for the filter dropdowns. */
  @RequirePermissions(PERMISSIONS.PRODUCTION_READ)
  @Get('filter-options')
  getFilterOptions() {
    return this.production.getFilterOptions();
  }

  @RequirePermissions(PERMISSIONS.PRODUCTION_READ)
  @Get('batches')
  listBatches(@Query() filters: BatchFilters) {
    return this.production.listBatches(filters);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTION_WRITE)
  @Post('batches')
  createBatch(@Body() dto: CreateBatchDto) {
    return this.production.createBatch(dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTION_READ)
  @Get('batches/:id')
  getBatch(@Param('id') id: string) {
    return this.production.getBatch(id);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTION_WRITE)
  @Patch('batches/:id')
  updateBatch(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.production.updateBatch(id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTION_WRITE)
  @Post('batches/:id/consumption')
  addConsumption(@Param('id') id: string, @Body() dto: AddConsumptionDto) {
    return this.production.addConsumption(id, dto);
  }

  @RequirePermissions(PERMISSIONS.PRODUCTION_WRITE)
  @Post('batches/:id/output')
  declareOutput(@Param('id') id: string, @Body() dto: DeclareOutputDto) {
    return this.production.declareOutput(id, dto);
  }
}
