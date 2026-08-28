import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Liveness check — must answer before anyone can log in. */
  @Public()
  @Get('health')
  health() {
    return this.appService.health();
  }
}
