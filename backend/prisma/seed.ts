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

/** Self-contained placeholder "photo" (SVG data-URI) so the demo shows the photo feature without needing internet access. */
function svgPhoto(ref: string, caption = 'Produit chimique'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f6df6"/><stop offset="1" stop-color="#7a5cff"/></linearGradient></defs><rect width="320" height="200" rx="16" fill="url(#g)"/><path d="M105 150 L138 72 L166 126 L186 88 L222 150 Z" fill="rgba(255,255,255,0.22)"/><text x="160" y="52" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">${ref}</text><text x="160" y="180" font-family="system-ui, sans-serif" font-size="15" fill="rgba(255,255,255,0.85)" text-anchor="middle">${caption}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function main() {
  console.log('Wiping existing data…');
  await prisma.supplierOrderLine.deleteMany();
  await prisma.supplierOrder.deleteMany();
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
      description: 'Matière première pour la production. Suivi par lot (FEFO à cause de la péremption).',
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
      description: 'Matière première pour la production. Pas de péremption, pas de lots. Variantes : couleur + taille.',
      hasBatches: false,
      hasExpiry: false,
      isProductionInput: true,
      hasColor: true,
      hasSize: true,
      defaultUnit: 'pièce',
      sortOrder: 1,
    },
  });
  const sparePartsType = await prisma.inventoryType.create({
    data: {
      key: 'spare-parts',
      label: 'Pièces détachées',
      singular: 'pièce détachée',
      description: "Stock de maintenance des machines. N'entre jamais dans la production. Stockage, machine et criticités suivis.",
      hasBatches: false,
      hasExpiry: false,
      isProductionInput: false,
      hasColor: false,
      hasSize: false,
      hasDescription: true,
      hasMachineInfo: true,
      defaultUnit: 'pièce',
      sortOrder: 2,
    },
  });
  const finishedGoodsType = await prisma.inventoryType.create({
    data: {
      key: 'finished-goods',
      label: 'Produits finis',
      singular: 'produit fini',
      description: 'Ce que l’usine produit — 1er choix, 2ème choix et rebut. Variantes : couleur, taille, sexe. Prix de vente en DZD. Alimenté par le module Production.',
      hasBatches: false,
      hasExpiry: false,
      isProductionInput: false,
      hasColor: true,
      hasSize: true,
      hasGender: true,
      hasPrice: true,
      hasQuality: true,
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
  // up and already expired, to demonstrate every FEFO/expiry state at once.
  const colle = await prisma.item.create({
    data: { inventoryTypeId: chemicalsType.id, name: 'Colle néoprène', reference: 'CH-001', unit: 'kg', reorderThreshold: 20, photoUrl: svgPhoto('CH-001') },
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
    data: { inventoryTypeId: chemicalsType.id, name: 'Solvant de nettoyage', reference: 'CH-002', unit: 'litre', reorderThreshold: 15, photoUrl: svgPhoto('CH-002') },
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
    data: { inventoryTypeId: chemicalsType.id, name: 'Vernis de finition', reference: 'CH-003', unit: 'litre', reorderThreshold: 10, photoUrl: svgPhoto('CH-003') },
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

  // Tige des chaussures — no batches, variants: colour + size
  const tigeSizes: Array<[name: string, reference: string, size: string, threshold: number, received: number, used: number]> = [
    ['Tige pointure 40', 'TG-040', '40', 200, 600, 250],
    ['Tige pointure 41', 'TG-041', '41', 200, 500, 350],
    ['Tige pointure 42', 'TG-042', '42', 200, 150, 0],
  ];
  for (const [name, reference, size, threshold, received, used] of tigeSizes) {
    const item = await prisma.item.create({
      data: { inventoryTypeId: tigeType.id, name, reference, unit: 'pièce', reorderThreshold: threshold, color: 'Noir', size, photoUrl: svgPhoto(reference, 'Tige des chaussures') },
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

  // Pièces détachées — maintenance continuity, machine-specific metadata and
// maintenance context (reference, employee, notes) on each usage.
  const spareParts: Array<{
    name: string;
    reference: string;
    threshold: number;
    received: number;
    used: number;
    description: string;
    machine: string;
    compatibility: string;
    manufacturer: string;
    location: string;
    criticality: string;
    maintenanceRef: string;
    maintenanceEmployee: string;
  }> = [
    {
      name: 'Courroie de transmission',
      reference: 'PD-010',
      threshold: 3,
      received: 6,
      used: 4,
      description: "Courroie trapézoïdale pour la motorisation des machines à coudre. Jeu de 2 fourni.",
      machine: 'Machine à coudre N°3',
      compatibility: 'Surjeteuses et piqueuses Adler',
      manufacturer: 'Gates',
      location: 'Atelier — armoire B2',
      criticality: 'Haute',
      maintenanceRef: 'MT-2026-014',
      maintenanceEmployee: 'Karim Bensaïd',
    },
    {
      name: 'Aiguille de piqueuse',
      reference: 'PD-011',
      threshold: 10,
      received: 40,
      used: 33,
      description: "Aiguille droite standard 90/14 pour piqueuses. Consommable remplacé à chaque série.",
      machine: 'Piqueuse N°2',
      compatibility: 'Piqueuses Singer 1609',
      manufacturer: 'Organ',
      location: 'Atelier — tiroir C1',
      criticality: 'Moyenne',
      maintenanceRef: 'MT-2026-011',
      maintenanceEmployee: 'Sofiane Merbah',
    },
    {
      name: 'Roulement à billes',
      reference: 'PD-012',
      threshold: 4,
      received: 10,
      used: 0,
      description: 'Roulement 6204-2RS schéma standard, toutes marques compatibles.',
      machine: 'Machine de découpe N°1',
      compatibility: 'Machine de découpe Bosch',
      manufacturer: 'SKF',
      location: 'Réserve — étagère A4',
      criticality: 'Haute',
      maintenanceRef: '',
      maintenanceEmployee: '',
    },
  ];
  for (const part of spareParts) {
    const item = await prisma.item.create({
      data: {
        inventoryTypeId: sparePartsType.id,
        name: part.name,
        reference: part.reference,
        unit: 'pièce',
        reorderThreshold: part.threshold,
        description: part.description,
        machine: part.machine,
        compatibility: part.compatibility,
        manufacturer: part.manufacturer,
        location: part.location,
        criticality: part.criticality,
        photoUrl: svgPhoto(part.reference, 'Pièce détachée'),
      },
    });
    await prisma.movement.create({
      data: { itemId: item.id, direction: 'IN', quantity: part.received, date: daysFromNow(-70), supplierId: mecaPieces.id },
    });
    if (part.used > 0) {
      await prisma.movement.create({
        data: {
          itemId: item.id,
          direction: 'OUT',
          quantity: part.used,
          date: daysFromNow(-15),
          reason: 'Maintenance',
          machine: part.machine,
          maintenanceRef: part.maintenanceRef,
          employee: part.maintenanceEmployee,
          notes: 'Remplacement de la pièce défaillante lors de la maintenance périodique.',
        },
      });
    }
  }

  // Produits finis — ce que l'usine produit réellement. La qualité de chaque
  // mouvement est classée (1er / 2ème / rebut) ; un mouvement SANS classe fait
  // remonter l'écart "unités inconnues / non justifiées" — le cœur du problème
  // du patron : des unités en stock qu'aucun enregistrement de production
  // n'explique. FG-001 illustre exactement ce cas (25 paires "apparues").
  const finishedGoods: Array<{
    name: string;
    reference: string;
    color: string;
    size: string;
    gender: string;
    price: number;
    threshold: number;
    // [quality | null, quantity, dateOffset, direction, reason]
    movements: Array<[string | null, number, number, 'IN' | 'OUT', string?]>;
  }> = [
    {
      name: 'Derbousse Homme 42',
      reference: 'FG-001',
      color: 'Noir',
      size: '42',
      gender: 'M',
      price: 4500,
      threshold: 100,
      movements: [
        ['1er', 1000, -60, 'IN'],
        ['2ème', 200, -60, 'IN'],
        ['rebut', 60, -60, 'IN'],
        ['1er', 850, -20, 'OUT', 'Vente'],
        ['2ème', 120, -15, 'OUT', 'Vente'],
        [null, 25, -45, 'IN'], // paires en stock sans origine de production -> inconnues
      ],
    },
    {
      name: 'Escarpin Femme 38',
      reference: 'FG-002',
      color: 'Bordeaux',
      size: '38',
      gender: 'F',
      price: 3900,
      threshold: 80,
      movements: [
        ['1er', 600, -55, 'IN'],
        ['2ème', 80, -55, 'IN'],
        ['rebut', 15, -55, 'IN'],
        ['1er', 520, -10, 'OUT', 'Vente'],
      ],
    },
    {
      name: 'Derbousse Homme 44',
      reference: 'FG-003',
      color: 'Brun',
      size: '44',
      gender: 'M',
      price: 4800,
      threshold: 60,
      movements: [
        ['1er', 400, -40, 'IN'],
        ['2ème', 40, -40, 'IN'],
        ['1er', 300, -8, 'OUT', 'Vente'],
        ['2ème', 30, -8, 'OUT', 'Vente'],
      ],
    },
  ];
  for (const fg of finishedGoods) {
    const item = await prisma.item.create({
      data: {
        inventoryTypeId: finishedGoodsType.id,
        name: fg.name,
        reference: fg.reference,
        unit: 'paire',
        reorderThreshold: fg.threshold,
        color: fg.color,
        size: fg.size,
        gender: fg.gender,
        price: fg.price,
        photoUrl: svgPhoto(fg.reference, 'Produit fini'),
      },
    });
    for (const [quality, quantity, days, direction, reason] of fg.movements) {
      await prisma.movement.create({
        data: {
          itemId: item.id,
          direction,
          quantity,
          date: daysFromNow(days),
          reason: reason ?? null,
          quality,
        },
      });
    }
  }

  // Commandes fournisseurs — one already received (matches the TG-040 receive
  // seeded above), one open without batches, one open chemicals order that
  // will ask for batch info when received in the UI.
  const tige40 = await prisma.item.findUniqueOrThrow({ where: { reference: 'TG-040' } });
  const tige41 = await prisma.item.findUniqueOrThrow({ where: { reference: 'TG-041' } });
  const tige42 = await prisma.item.findUniqueOrThrow({ where: { reference: 'TG-042' } });

  await prisma.supplierOrder.create({
    data: {
      supplierId: fournituresBatna.id,
      orderDate: daysFromNow(-30),
      status: 'received',
      receivedDate: daysFromNow(-30),
      lines: { create: [{ itemId: tige40.id, quantityOrdered: 600 }] },
    },
  });

  await prisma.supplierOrder.create({
    data: {
      supplierId: fournituresBatna.id,
      orderDate: daysFromNow(-2),
      status: 'open',
      notes: 'Réappro tiges noir - fin de mois',
      lines: { create: [{ itemId: tige41.id, quantityOrdered: 500 }, { itemId: tige42.id, quantityOrdered: 100 }] },
    },
  });

  await prisma.supplierOrder.create({
    data: {
      supplierId: sodichim.id,
      orderDate: daysFromNow(-1),
      status: 'open',
      notes: 'Lot urgent - colle néoprène',
      lines: { create: [{ itemId: colle.id, quantityOrdered: 25 }] },
    },
  });

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
