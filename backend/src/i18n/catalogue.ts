/**
 * Same shape as the frontend's lib/i18n/catalogue.ts, deliberately: French
 * and Arabic sit on the same line for the same key, so a translator (or a
 * reviewer) never has to cross-reference two files to check a pair.
 */
export interface Entry {
  fr: string;
  ar: string;
}

export function catalogue<const T extends Record<string, Entry>>(entries: T): T {
  return entries;
}
