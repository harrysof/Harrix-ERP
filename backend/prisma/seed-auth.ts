import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS, serializePermissions } from '../src/auth/permissions.js';

/**
 * Creates the roles and the first gérant account.
 *
 * Kept SEPARATE from prisma/seed.ts on purpose: seed.ts wipes and reloads
 * demo stock data, which you stop running the moment real counts are entered.
 * Accounts must survive that. This script is additive — it never deletes, and
 * it is safe to re-run (existing roles are updated, existing users left alone).
 *
 * Run with: npm run seed:auth
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set — copy .env.example to .env first.');

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const P = PERMISSIONS;

/**
 * The four roles from the build plan. Permissions are chosen so that the
 * plan's acceptance test holds: "a stock worker logs in and physically cannot
 * reach HR data, even if they type the address by hand."
 */
const ROLES = [
  {
    key: 'gerant',
    label: 'Gérant',
    description: "Accès complet, y compris la gestion des utilisateurs et le journal d'activité.",
    isProtected: true,
    sortOrder: 0,
    permissions: Object.values(P),
  },
  {
    key: 'stock',
    label: 'Magasinier',
    description: 'Réceptions, sorties et consultation du stock. Voit les fournisseurs, pas les salaires.',
    isProtected: false,
    sortOrder: 1,
    permissions: [P.STOCK_READ, P.STOCK_WRITE, P.SUPPLIERS_READ, P.PRODUCTION_READ],
  },
  {
    key: 'production',
    label: 'Chef de production',
    description: 'Crée les lots, déclare les sorties, consulte le stock nécessaire à la production.',
    isProtected: false,
    sortOrder: 2,
    permissions: [P.PRODUCTION_READ, P.PRODUCTION_WRITE, P.STOCK_READ, P.STOCK_WRITE],
  },
  {
    key: 'rh',
    label: 'Ressources humaines',
    description: 'Employés, heures et absences. Aucun accès au stock ni à la production.',
    isProtected: false,
    sortOrder: 3,
    permissions: [P.HR_READ, P.HR_WRITE],
  },
];

async function main() {
  console.log('Seeding roles…');
  const roleIds: Record<string, string> = {};
  for (const role of ROLES) {
    const data = {
      label: role.label,
      description: role.description,
      permissions: serializePermissions(role.permissions),
      isProtected: role.isProtected,
      sortOrder: role.sortOrder,
    };
    const saved = await prisma.role.upsert({
      where: { key: role.key },
      update: data,
      create: { key: role.key, ...data },
    });
    roleIds[role.key] = saved.id;
    console.log(`  ${saved.label.padEnd(22)} ${role.permissions.length} permission(s)`);
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`\n${userCount} user(s) already exist — leaving them untouched.`);
    return;
  }

  // First run only. The password is printed once, here, and must be changed
  // at first login — it is not a secret while it sits in this file.
  const login = process.env.ADMIN_LOGIN ?? 'gerant';
  const password = process.env.ADMIN_PASSWORD ?? 'harrix2026';

  await prisma.user.create({
    data: {
      login,
      fullName: 'Gérant',
      passwordHash: await bcrypt.hash(password, 12),
      roleId: roleIds.gerant,
    },
  });

  console.log('\n  ─────────────────────────────────────────────');
  console.log('   Premier compte créé :');
  console.log(`     identifiant : ${login}`);
  console.log(`     mot de passe : ${password}`);
  console.log('   CHANGEZ CE MOT DE PASSE APRÈS LA PREMIÈRE CONNEXION.');
  console.log('  ─────────────────────────────────────────────');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
