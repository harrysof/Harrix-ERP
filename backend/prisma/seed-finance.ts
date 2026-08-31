/**
 * The cost categories a shoe factory starts with.
 *
 * Seeded rather than hard-coded, for the same reason the inventories are:
 * this is one factory's chart of costs, not every factory's. The accountant
 * renames these, reorders them, and adds his own — "gardiennage", "assurance
 * machine", "transport des ouvriers". Only `matieres-premieres` is special,
 * and only because its amount is summed from production instead of typed.
 *
 * Idempotent: run it as often as you like. It upserts by key and never
 * touches an entry anyone has recorded.
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — copy .env.example to .env first.');

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const CATEGORIES = [
  {
    key: 'matieres-premieres',
    label: 'Matières premières',
    description:
      "Calculée depuis la production : la somme de ce que les lots du mois ont réellement consommé, au coût de chaque lot de stock. Ne se saisit pas — se corrige, en gardant la valeur calculée visible à côté.",
    nature: 'DIRECT',
    behavior: 'VARIABLE',
    isMaterials: true,
    isProtected: true,
    sortOrder: 0,
  },
  {
    key: 'main-doeuvre-directe',
    label: "Main-d'œuvre directe",
    description:
      "Salaires et charges des ouvriers de production. Direct : rattachez-les à un produit quand une équipe travaille sur un seul modèle, sinon ils sont répartis comme des charges indirectes.",
    nature: 'DIRECT',
    behavior: 'VARIABLE',
    isProtected: true,
    sortOrder: 1,
  },
  {
    key: 'sous-traitance',
    label: 'Sous-traitance',
    description: "Opérations confiées à l'extérieur (couture, finition, traitement).",
    nature: 'DIRECT',
    behavior: 'VARIABLE',
    isProtected: false,
    sortOrder: 2,
  },
  {
    key: 'energie',
    label: 'Énergie',
    description: 'Électricité, gaz, eau. Varie avec le volume produit.',
    nature: 'INDIRECT',
    behavior: 'VARIABLE',
    isProtected: true,
    sortOrder: 3,
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Entretien des machines, pièces détachées consommées, interventions.',
    nature: 'INDIRECT',
    behavior: 'VARIABLE',
    isProtected: true,
    sortOrder: 4,
  },
  {
    key: 'loyer',
    label: 'Loyer et charges du local',
    description: "Le même montant chaque mois, que l'usine tourne ou non.",
    nature: 'INDIRECT',
    behavior: 'FIXED',
    isProtected: true,
    sortOrder: 5,
  },
  {
    key: 'salaires-indirects',
    label: 'Salaires indirects',
    description: "Encadrement, administration, gardiennage — tout ce qui ne se rattache à aucun produit en particulier.",
    nature: 'INDIRECT',
    behavior: 'FIXED',
    isProtected: true,
    sortOrder: 6,
  },
  {
    key: 'amortissements',
    label: 'Amortissements',
    description: "Usure des machines et des installations, étalée sur leur durée de vie.",
    nature: 'INDIRECT',
    behavior: 'FIXED',
    isProtected: true,
    sortOrder: 7,
  },
  {
    key: 'transport-logistique',
    label: 'Transport et logistique',
    description: 'Livraisons, carburant, frais de port.',
    nature: 'INDIRECT',
    behavior: 'VARIABLE',
    isProtected: false,
    sortOrder: 8,
  },
  {
    key: 'administratif',
    label: 'Frais administratifs',
    description: 'Téléphone, internet, fournitures, honoraires, assurances.',
    nature: 'INDIRECT',
    behavior: 'FIXED',
    isProtected: false,
    sortOrder: 9,
  },
];

async function main() {
  console.log('Seeding cost categories…');

  for (const category of CATEGORIES) {
    const { key, isMaterials = false, ...rest } = category;
    const saved = await prisma.costCategory.upsert({
      where: { key },
      // An existing category keeps its label and description — the accountant
      // may well have rewritten them, and a re-seed must not undo that.
      update: {},
      create: { key, isMaterials, ...rest },
    });
    console.log(`  ${saved.label.padEnd(28)} ${saved.nature.padEnd(8)} ${saved.behavior}`);
  }

  const settings = await prisma.financeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  console.log(
    `\nDefault margin ${(settings.defaultMargin * 100).toFixed(0)} % · allocation basis ${settings.allocationBasis}`,
  );
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
