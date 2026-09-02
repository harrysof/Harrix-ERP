import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { FinanceService } from './finance.service.js';
import { CopyFactoryCostsDto, CreateFactoryCostDto } from './dto/factory-cost.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('costs')
  listCosts(@Query('month') month: string) {
    return this.finance.listCosts(month);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('costs/months')
  listMonths() {
    return this.finance.listMonthsWithCosts();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('costs')
  createCost(@Body() dto: CreateFactoryCostDto) {
    return this.finance.createCost(dto);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('costs/copy')
  copyCosts(@Body() dto: CopyFactoryCostsDto) {
    return this.finance.copyMonth(dto.from, dto.to);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Delete('costs/:id')
  deleteCost(@Param('id') id: string) {
    return this.finance.deleteCost(id);
  }
}
