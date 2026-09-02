import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SupplierOrdersModule } from './supplier-orders/supplier-orders.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { StockModule } from './stock/stock.module.js';
import { ProductionModule } from './production/production.module.js';
import { PurchasingModule } from './purchasing/purchasing.module.js';
import { SalesModule } from './sales/sales.module.js';
import { HrModule } from './hr/hr.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { ZakatModule } from './zakat/zakat.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AuditModule } from './audit/audit.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { PermissionsGuard } from './auth/permissions.guard.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AuditModule,
    SettingsModule,
    SuppliersModule,
    SupplierOrdersModule,
    StockModule,
    ProductionModule,
    PurchasingModule,
    SalesModule,
    HrModule,
    FinanceModule,
    ZakatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: authenticate first, then check permissions. Registering
    // both globally means every endpoint is protected by default — a new
    // route has to opt out with @Public() rather than opt in.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Records every successful write. Global for the same reason.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
