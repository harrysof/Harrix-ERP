import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Wraps PrismaClient so the rest of the app injects `PrismaService` instead
 * of constructing a client directly. Prisma 7 requires a driver adapter —
 * this is the one place that knows which one. Swapping SQLite for
 * PostgreSQL later means changing only this file (see PROJECT_CONTEXT.md →
 * "Backend" → "Moving to PostgreSQL").
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    super({ adapter: new PrismaBetterSqlite3({ url }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
