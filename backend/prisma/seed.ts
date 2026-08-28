import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Demonstration data — the same numbers the frontend used to seed locally
 * (apps/dashboard/src/lib/seedData.ts) before Stock moved onto this API, so
 * the two didn't visibly disagree during the cutover. Real factory counts
 * replace this in Phase 4's "load real starting quantities" step — see
 * PROJECT_CONTEXT.md.
 *
 * Run with: npm run prisma:seed  (wipes and recreates all rows below)
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — copy .env.example to .env first.');

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log('Wiping existing data…');
  await prisma.productionConsumption.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.item.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.inventoryType.deleteMany();

  console.log('Seeding inventory types…');
  const chemicalsType = await prisma.inventoryType.create({
    data: {
      key: 'chemicals',
      label: 'Produits chimiques',
      singular: 'produit chimique',
      description: 'Matière première pour la production. Suivi par lot (FIFO) à cause de la péremption.',
      hasBatches: true,
      hasExpiry: true,
      isProductionInput: true,
      defaultUnit: 'kg',
      sortOrder: 0,
    },
  });
  const tigeType = await prisma.inventoryType.create({
    data: {
      key: 'tige',
      label: 'Tige des chaussures',
      singular: 'tige',
      description: 'Matière première pour la production. Pas de péremption, pas de lots.',
      hasBatches: false,
      hasExpiry: false,
      isProductionInput: true,
      defaultUnit: 'pièce',
      sortOrder: 1,
    },
  });
  const sparePartsType = await prisma.inventoryType.create({
    data: {
      key: 'spare-parts',
      label: 'Pièces détachées',
      singular: 'pièce détachée',
      description: "Stock de maintenance des machines. N'entre jamais dans la production.",
      hasBatches: false,
      hasExpiry: false,
      isProductionInput: false,
      defaultUnit: 'pièce',
      sortOrder: 2,
    },
  });
  await prisma.inventoryType.create({
    data: {
      key: 'finished-goods',
      label: 'Produits finis',
      singular: 'produit fini',
      description: '1er choix, 2ème choix et rebut — alimenté par le module Production.',
      hasBatches: false,
      hasExpiry: false,
      isProductionInput: false,
      defaultUnit: 'paire',
      sortOrder: 3,
    },
  });

  console.log('Seeding suppliers…');
  const sodichim = await prisma.supplier.create({ data: { name: 'Sodichim', phone: '021 45 67 89', address: 'Zone industrielle, Alger' } });
  const chimindus = await prisma.supplier.create({ data: { name: 'Chimindus', phone: '023 12 34 56' } });
  const fournituresBatna = await prisma.supplier.create({ data: { name: 'Fournitures Batna', phone: '033 98 76 54', address: 'Batna' } });
  const mecaPieces = await prisma.supplier.create({ data: { name: 'MécaPièces', phone: '021 33 22 11' } });

  console.log('Seeding items, batches and movements…');

  // Produits chimiques — colle néoprène: two batches, the first nearly used
  // up and already expired, to demonstrate every FIFO/expiry state at once.
  const colle = await prisma.item.create({
    data: { inventoryTypeId: chemicalsType.id, name: 'Colle néoprène', reference: 'CH-001', unit: 'kg', reorderThreshold: 20 },
  });
  const colleBatch1 = await prisma.batch.create({
    data: { itemId: colle.id, batchNumber: 'L-2401', receivedDate: daysFromNow(-60), expiryDate: daysFromNow(-5) },
  });
  const colleBatch2 = await prisma.batch.create({
    data: { itemId: colle.id, batchNumber: 'L-2412', receivedDate: daysFromNow(-10), expiryDate: daysFromNow(20) },
  });
  await prisma.movement.createMany({
    data: [
      { itemId: colle.id, batchId: colleBatch1.id, direction: 'IN', quantity: 40, date: daysFromNow(-60), supplierId: sodichim.id },
      { itemId: colle.id, batchId: colleBatch1.id, direction: 'OUT', quantity: 35, date: daysFromNow(-20), reason: 'Production' },
      { itemId: colle.id, batchId: colleBatch2.id, direction: 'IN', quantity: 30, date: daysFromNow(-10), supplierId: sodichim.id },
    ],
  });

  const solvant = await prisma.item.create({
    data: { inventoryTypeId: chemicalsType.id, name: 'Solvant de nettoyage', reference: 'CH-002', unit: 'litre', reorderThreshold: 15 },
  });
  const solvantBatch = await prisma.batch.create({
    data: { itemId: solvant.id, batchNumber: 'L-2405', receivedDate: daysFromNow(-40), expiryDate: daysFromNow(200) },
  });
  await prisma.movement.createMany({
    data: [
      { itemId: solvant.id, batchId: solvantBatch.id, direction: 'IN', quantity: 25, date: daysFromNow(-40), supplierId: sodichim.id },
      { itemId: solvant.id, batchId: solvantBatch.id, direction: 'OUT', quantity: 8, date: daysFromNow(-5), reason: 'Production' },
    ],
  });

  const vernis = await prisma.item.create({
    data: { inventoryTypeId: chemicalsType.id, name: 'Vernis de finition', reference: 'CH-003', unit: 'litre', reorderThreshold: 10 },
  });
  const vernisBatch = await prisma.batch.create({
    data: { itemId: vernis.id, batchNumber: 'L-2408', receivedDate: daysFromNow(-25), expiryDate: daysFromNow(15) },
  });
  await prisma.movement.createMany({
    data: [
      { itemId: vernis.id, batchId: vernisBatch.id, direction: 'IN', quantity: 12, date: daysFromNow(-25), supplierId: chimindus.id },
      { itemId: vernis.id, batchId: vernisBatch.id, direction: 'OUT', quantity: 5, date: daysFromNow(-3), reason: 'Production' },
    ],
  });

  // Tige des chaussures — no batches
  const tigeSizes: Array<[name: string, reference: string, threshold: number, received: number, used: number]> = [
    ['Tige pointure 40', 'TG-040', 200, 600, 250],
    ['Tige pointure 41', 'TG-041', 200, 500, 350],
    ['Tige pointure 42', 'TG-042', 200, 150, 0],
  ];
  for (const [name, reference, threshold, received, used] of tigeSizes) {
    const item = await prisma.item.create({
      data: { inventoryTypeId: tigeType.id, name, reference, unit: 'pièce', reorderThreshold: threshold },
    });
    await prisma.movement.create({
      data: { itemId: item.id, direction: 'IN', quantity: received, date: daysFromNow(-30), supplierId: fournituresBatna.id },
    });
    if (used > 0) {
      await prisma.movement.create({
        data: { itemId: item.id, direction: 'OUT', quantity: used, date: daysFromNow(-8), reason: 'Production' },
      });
    }
  }

  // Pièces détachées
  const spareParts: Array<[name: string, reference: string, threshold: number, received: number, used: number]> = [
    ['Courroie de transmission', 'PD-010', 3, 6, 4],
    ['Aiguille de piqueuse', 'PD-011', 10, 40, 33],
    ['Roulement à billes', 'PD-012', 4, 10, 0],
  ];
  for (const [name, reference, threshold, received, used] of spareParts) {
    const item = await prisma.item.create({
      data: { inventoryTypeId: sparePartsType.id, name, reference, unit: 'pièce', reorderThreshold: threshold },
    });
    await prisma.movement.create({
      data: { itemId: item.id, direction: 'IN', quantity: received, date: daysFromNow(-70), supplierId: mecaPieces.id },
    });
    if (used > 0) {
      await prisma.movement.create({
        data: { itemId: item.id, direction: 'OUT', quantity: used, date: daysFromNow(-15), reason: 'Maintenance' },
      });
    }
  }

  console.log('Seed complete.');
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
