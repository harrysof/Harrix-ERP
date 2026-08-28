import { Controller, Get, Query } from '@nestjs/common';
import { AuditService, type AuditFilters } from './audit.service.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

/** The whole log is gérant-only: it names who did what. */
@Controller('audit')
@RequirePermissions(PERMISSIONS.AUDIT_READ)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() filters: AuditFilters) {
    return this.audit.list(filters);
  }

  @Get('filter-options')
  filterOptions() {
    return this.audit.getFilterOptions();
  }
}
