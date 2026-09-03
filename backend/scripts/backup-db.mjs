/**
 * Takes a consistent snapshot of the database, verifies it, and prunes old ones.
 *
 * Why this exists: the whole factory's history — every stock movement, every
 * order, every payroll hour — lives in one file. There is no reconstructing it
 * from memory. The build plan calls this out as a day-one task.
 *
 * Why not just copy the file: dev.db can be mid-write when you copy it. A
 * plain copy (cp / Copy-Item / a sync client) can capture a torn page and give
 * you a backup that only fails when you finally need it. SQLite's online
 * backup API takes a transactionally consistent snapshot while the server
 * keeps running, which is what db.backup() below uses.
 *
 * Every snapshot is opened and integrity-checked before it counts as taken —
 * "an untested backup is not a backup" (build plan, Phase 10).
 *
 *   node scripts/backup-db.mjs               → backend/backups/
 *   node scripts/backup-db.mjs --out D:/safe → somewhere else (do this too)
 *   node scripts/backup-db.mjs --keep 60
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'harrix-';
const SUFFIX = '.db';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Reads DATABASE_URL from backend/.env without pulling in a dotenv dependency. */
function databaseFile() {
  const envPath = join(BACKEND_ROOT, '.env');
  let url = process.env.DATABASE_URL ?? '';
  if (!url && existsSync(envPath)) {
    const line = readFileLines(envPath).find((l) => l.trim().startsWith('DATABASE_URL='));
    url = line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
  }
  if (!url) throw new Error('DATABASE_URL introuvable (ni dans l\u2019environnement, ni dans backend/.env).');
  if (!url.startsWith('file:')) {
    throw new Error(
      `Cette sauvegarde ne gère que SQLite. DATABASE_URL pointe vers "${url.split(':')[0]}:" — ` +
        'utilisez pg_dump si vous êtes passé à PostgreSQL.',
    );
  }
  // Prisma resolves a relative file: URL against the schema's directory.
  const raw = url.slice('file:'.length);
  return resolve(BACKEND_ROOT, raw.startsWith('./') || raw.startsWith('../') ? raw : `./${raw}`);
}

function readFileLines(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function human(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

async function main() {
  const source = databaseFile();
  if (!existsSync(source)) throw new Error(`Base de données introuvable : ${source}`);

  const outDir = resolve(BACKEND_ROOT, arg('out', join(BACKEND_ROOT, 'backups')));
  const keep = Math.max(1, Number(arg('keep', '30')) || 30);
  mkdirSync(outDir, { recursive: true });

  const target = join(outDir, `${PREFIX}${timestamp()}${SUFFIX}`);

  // Read-only: a backup must never be able to modify the live database.
  const db = new Database(source, { readonly: true });
  try {
    await db.backup(target);
  } finally {
    db.close();
  }

  // Verify before we trust it — and before pruning anything on its strength.
  const check = new Database(target, { readonly: true });
  let verdict;
  let rows = 0;
  try {
    verdict = check.pragma('integrity_check', { simple: true });
    for (const { name } of check
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()) {
      rows += check.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get().c;
    }
  } finally {
    check.close();
  }
  if (verdict !== 'ok') {
    unlinkSync(target);
    throw new Error(`La sauvegarde est corrompue (integrity_check: ${verdict}). Fichier supprimé, rien n'a été purgé.`);
  }

  console.log(`Sauvegarde OK : ${target}`);
  console.log(`  ${human(statSync(target).size)}, ${rows} lignes, integrity_check: ok`);

  // Prune only after a verified success, newest kept.
  const existing = readdirSync(outDir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
    .sort()
    .reverse();
  for (const stale of existing.slice(keep)) {
    unlinkSync(join(outDir, stale));
    console.log(`  purgé : ${stale}`);
  }
  console.log(`  ${Math.min(existing.length, keep)} sauvegarde(s) conservée(s) sur ${keep}.`);
}

main().catch((error) => {
  console.error(`\n[sauvegarde] ÉCHEC : ${error.message}\n`);
  process.exit(1);
});
