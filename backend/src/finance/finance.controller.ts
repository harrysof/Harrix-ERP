import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { FinanceService } from './finance.service.js';
import {
  CreateCostCategoryDto,
  CreateCostEntryDto,
  DuplicateMonthDto,
  PeriodQueryDto,
  SetMaterialOverrideDto,
  SetProductMarginDto,
  UpdateCostCategoryDto,
  UpdateCostEntryDto,
  UpdateFinanceSettingsDto,
} from './dto/finance.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

/**
 * Three levels, because three different things happen here:
 *
 *   finance:read    — see what the factory spends and what a pair costs.
 *   finance:write   — the accountant's daily job: record charges, correct a
 *                     month's materials.
 *   finance:manage  — change how costs are classified and how they are shared
 *                     out. That decides what every price is computed from, so
 *                     it is deliberately not the same permission as entering
 *                     the electricity bill.
 */
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  /** Everything the Finance tab renders for a period, in one call. */
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('overview')
  overview(@Query() query: PeriodQueryDto) {
    return this.finance.getOverview(query);
  }

  // --- Settings ------------------------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('settings')
  settings() {
    return this.finance.getSettings();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @Patch('settings')
  updateSettings(@Body() dto: UpdateFinanceSettingsDto) {
    return this.finance.updateSettings(dto);
  }

  // --- Categories ----------------------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('categories')
  listCategories() {
    return this.finance.listCategories();
  }

  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @Post('categories')
  createCategory(@Body() dto: CreateCostCategoryDto) {
    return this.finance.createCategory(dto);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCostCategoryDto) {
    return this.finance.updateCategory(id, dto);
  }

  /** Only succeeds for a custom category nothing has been recorded against. */
  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.finance.deleteCategory(id);
  }

  // --- Entries -------------------------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @Get('entries')
  listEntries(@Query() query: PeriodQueryDto) {
    return this.finance.listEntries(query);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('entries')
  createEntry(@Body() dto: CreateCostEntryDto) {
    return this.finance.createEntry(dto);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Patch('entries/:id')
  updateEntry(@Param('id') id: string, @Body() dto: UpdateCostEntryDto) {
    return this.finance.updateEntry(id, dto);
  }

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Delete('entries/:id')
  deleteEntry(@Param('id') id: string) {
    return this.finance.deleteEntry(id);
  }

  /** Copy last month's charges forward, so the rent is typed once a year. */
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Post('entries/duplicate')
  duplicateMonth(@Body() dto: DuplicateMonthDto) {
    return this.finance.duplicateMonth(dto);
  }

  // --- Material-cost correction -------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Put('material-override')
  setMaterialOverride(@Body() dto: SetMaterialOverrideDto) {
    return this.finance.setMaterialOverride(dto);
  }

  /** Drop the correction and go back to what production actually consumed. */
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @Delete('material-override/:month')
  deleteMaterialOverride(@Param('month') month: string) {
    return this.finance.deleteMaterialOverride(month);
  }

  // --- Per-product margin --------------------------------------------------

  @RequirePermissions(PERMISSIONS.FINANCE_MANAGE)
  @Patch('products/:itemId/margin')
  setProductMargin(@Param('itemId') itemId: string, @Body() dto: SetProductMarginDto) {
    return this.finance.setProductMargin(itemId, dto);
  }
}
