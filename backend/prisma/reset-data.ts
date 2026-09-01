import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Wipes every business record so the factory can start fresh, while leaving
 * the app usable: accounts, roles and the inventory-type setup survive, and
 * so does the audit log — the app's own banner promises it is never modified
 * or erased, and this script keeps that promise rather than being the one
 * place that breaks it.
 *
 * Deletion order is children-before-parents, explicit rather than relying on
 * the schema's onDelete: Cascade, matching prisma/seed.ts's style.
 *
 * Run with: npm run reset:data
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — copy .env.example to .env first.');

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  console.log('Wiping business data (accounts, roles, inventory types and the audit log are kept)…');

  // Purchasing
  await prisma.receiptLine.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();

  // Sales
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  // HR
  await prisma.timeEntry.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.employee.deleteMany();

  // Production
  await prisma.productionConsumption.deleteMany();
  await prisma.productionBatch.deleteMany();

  // Stock's own supplier-orders flow
  await prisma.supplierOrderLine.deleteMany();
  await prisma.supplierOrder.deleteMany();

  // Stock ledger and articles
  await prisma.movement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.item.deleteMany();

  // Suppliers
  await prisma.supplier.deleteMany();

  console.log('Done. Stock, production, purchasing, sales and HR are empty. Log in as before to start entering real data.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
