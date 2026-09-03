import type { Entry } from '../catalogue.js';
import { currentLang } from '../context.js';
import { common } from './common.js';
import { auth } from './auth.js';
import { stock } from './stock.js';
import { production } from './production.js';
import { purchasing } from './purchasing.js';
import { sales } from './sales.js';
import { hr } from './hr.js';
import { finance } from './finance.js';
import { zakat } from './zakat.js';
import { settings } from './settings.js';
import { users } from './users.js';

/**
 * Mirrors the frontend's lib/i18n/index.ts: one flat map merged from every
 * domain file, with `TranslationKey` derived from it so a typo in `t(...)`
 * is a compile error, not a runtime one.
 */
const ENTRIES = {
  ...common,
  ...auth,
  ...stock,
  ...production,
  ...purchasing,
  ...sales,
  ...hr,
  ...finance,
  ...zakat,
  ...settings,
  ...users,
};

export type MessageKey = keyof typeof ENTRIES;

/** Replaces every {name} placeholder with the matching value. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const entry = ENTRIES[key] as Entry;
  const raw = entry[currentLang()];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
