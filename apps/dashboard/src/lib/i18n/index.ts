import type { Entry } from "./catalogue";
import { shell } from "./shell";
import { common } from "./common";
import { stock } from "./stock";
import { production } from "./production";
import { purchasing } from "./purchasing";
import { sales } from "./sales";
import { hr } from "./hr";
import { finance } from "./finance";
import { zakat } from "./zakat";
import { admin } from "./admin";
import { dashboard } from "./dashboard";

/**
 * The translation catalogue.
 *
 * Split by domain, and within each file the French and Arabic of a string sit
 * on the same line (see catalogue.ts for why). This index does two things:
 * merges the namespaces into the flat `TRANSLATIONS` the app reads, and
 * derives `TranslationKey` from the merged shape so a typo in `t("…")` is a
 * compile error.
 *
 * French remains the source of truth in the sense that it is what the office
 * writes first — but the type below is symmetric, so neither language can be
 * left behind.
 */
const ENTRIES = {
  ...shell,
  ...common,
  ...stock,
  ...production,
  ...purchasing,
  ...sales,
  ...hr,
  ...finance,
  ...zakat,
  ...admin,
  ...dashboard,
};

export type TranslationKey = keyof typeof ENTRIES;

export type Language = "fr" | "ar";

export const LANGUAGES: Language[] = ["fr", "ar"];

/** Written direction of each language — drives <html dir> and the RTL styles. */
export const DIRECTION: Record<Language, "ltr" | "rtl"> = { fr: "ltr", ar: "rtl" };

/**
 * The locale used for Intl date/number formatting per language.
 *
 * `ar-DZ-u-nu-latn` is deliberate: Algeria writes its numbers in Western
 * digits — on invoices, on bank statements, on CNAS forms — so a shop-floor
 * figure stays cross-checkable against the supplier's paperwork. Only the
 * date wording (month names, weekday names) becomes Arabic.
 */
export const LOCALE: Record<Language, string> = { fr: "fr-FR", ar: "ar-DZ-u-nu-latn" };

/** How each language names itself, for the language switcher. */
export const LANGUAGE_LABEL: Record<Language, string> = { fr: "Français", ar: "العربية" };

/** Two-letter chip shown inside the switcher button. */
export const LANGUAGE_SHORT: Record<Language, string> = { fr: "FR", ar: "ع" };

function project(lang: Language): Record<TranslationKey, string> {
  const out = {} as Record<TranslationKey, string>;
  for (const [key, entry] of Object.entries(ENTRIES) as Array<[TranslationKey, Entry]>) {
    out[key] = entry[lang];
  }
  return out;
}

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  fr: project("fr"),
  ar: project("ar"),
};

/** Replaces every {name} placeholder with the matching value. */
export function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  const raw = TRANSLATIONS[lang][key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * Picks a plural form the way French and Arabic each need it.
 *
 * French is the simple case (0 and 1 singular, the rest plural). Arabic has
 * six grammatical numbers, but the strings this app actually pluralises are
 * counted nouns in a UI list, where the dual and the "many" forms are what
 * matter; callers pass the forms they need and anything they omit falls back
 * to `other`, which is the correct shape for a counted noun above ten.
 */
export function plural(
  lang: Language,
  count: number,
  forms: { one: string; two?: string; few?: string; other: string },
): string {
  if (lang === "fr") return count > 1 ? forms.other : forms.one;

  const n = Math.abs(Math.round(count));
  if (n === 1) return forms.one;
  if (n === 2) return forms.two ?? forms.other;
  if (n % 100 >= 3 && n % 100 <= 10) return forms.few ?? forms.other;
  return forms.other;
}
