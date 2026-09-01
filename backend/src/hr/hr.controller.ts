import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HrService } from './hr.service.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto.js';
import { CreateTimeEntryDto } from './dto/time-entry.dto.js';
import { CreateAbsenceDto } from './dto/absence.dto.js';
import { CreateOvertimeEntryDto } from './dto/overtime-entry.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('hr')
export class HrController {
  constructor(private readonly hr: HrService) {}

  // --- employees -------------------------------------------------------

  @RequirePermissions(PERMISSIONS.HR_READ)
  @Get('employees')
  listEmployees(@Query('includeArchived') includeArchived?: string, @Query('search') search?: string) {
    return this.hr.listEmployees({ includeArchived: includeArchived === 'true', search });
  }

  @RequirePermissions(PERMISSIONS.HR_READ)
  @Get('employees/:id')
  getEmployee(@Param('id') id: string) {
    return this.hr.getEmployee(id);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hr.createEmployee(dto);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.hr.updateEmployee(id, dto);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Patch('employees/:id/archive')
  archiveEmployee(@Param('id') id: string) {
    return this.hr.setArchived(id, true);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Patch('employees/:id/unarchive')
  unarchiveEmployee(@Param('id') id: string) {
    return this.hr.setArchived(id, false);
  }

  // --- time entries ------------------------------------------------------

  @RequirePermissions(PERMISSIONS.HR_READ)
  @Get('time-entries')
  listTimeEntries(@Query('employeeId') employeeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.hr.listTimeEntries({ employeeId, from, to });
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Post('time-entries')
  createTimeEntry(@Body() dto: CreateTimeEntryDto) {
    return this.hr.createTimeEntry(dto);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Delete('time-entries/:id')
  deleteTimeEntry(@Param('id') id: string) {
    return this.hr.deleteTimeEntry(id);
  }

  // --- absences ------------------------------------------------------------

  @RequirePermissions(PERMISSIONS.HR_READ)
  @Get('absences')
  listAbsences(@Query('employeeId') employeeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.hr.listAbsences({ employeeId, from, to });
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Post('absences')
  createAbsence(@Body() dto: CreateAbsenceDto) {
    return this.hr.createAbsence(dto);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Delete('absences/:id')
  deleteAbsence(@Param('id') id: string) {
    return this.hr.deleteAbsence(id);
  }

  // --- overtime entries ------------------------------------------------------

  @RequirePermissions(PERMISSIONS.HR_READ)
  @Get('overtime-entries')
  listOvertimeEntries(@Query('employeeId') employeeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.hr.listOvertimeEntries({ employeeId, from, to });
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Post('overtime-entries')
  createOvertimeEntry(@Body() dto: CreateOvertimeEntryDto) {
    return this.hr.createOvertimeEntry(dto);
  }

  @RequirePermissions(PERMISSIONS.HR_WRITE)
  @Delete('overtime-entries/:id')
  deleteOvertimeEntry(@Param('id') id: string) {
    return this.hr.deleteOvertimeEntry(id);
  }

  // --- monthly summary -----------------------------------------------------

  @RequirePermissions(PERMISSIONS.HR_READ)
  @Get('summary')
  getSummary(@Query('month') month: string) {
    return this.hr.getMonthlySummary(month);
  }
}
