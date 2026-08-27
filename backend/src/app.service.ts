import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return { status: 'ok', service: 'harrix-erp-backend', time: new Date().toISOString() };
  }
}
