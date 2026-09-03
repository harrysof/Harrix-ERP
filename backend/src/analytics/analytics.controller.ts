import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.js';

/**
 * The tableau de bord's one endpoint.
 *
 * Deliberately NOT decorated with @RequirePermissions: the dashboard is the
 * landing page for every role, and refusing it outright would leave a
 * magasinier staring at an error on login. Instead the caller's permissions
 * are handed to the service, which builds only the sections that caller is
 * allowed to see and returns `null` for the rest — the guard is inside the
 * payload rather than in front of the route.
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** `?month=AAAA-MM`; omitted means the current month. */
  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.analytics.getDashboard(month, user.permissions);
  }
}
