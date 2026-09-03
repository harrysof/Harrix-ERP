import { LOCALE, type Language } from "./i18n";

/**
 * Number, money and date formatting, in whichever language is active.
 *
 * These are called from render paths all over the app, most of them outside a
 * React component (table cell helpers, `.map()` bodies, chart tick
 * functions), so the language arrives through a module-level setter rather
 * than a hook — the same indirection `api.ts` uses for the auth token, and
 * for the same reason: it keeps this file free of React.
 *
 * `LanguageContext` calls `setFormatLanguage` whenever the choice changes,
 * before it re-renders the tree, so the formatters below are always in step
 * with what is on screen.
 *
 * Digits stay Western in both languages (see LOCALE in i18n/index.ts): only
 * the date wording and the grouping conventions change.
 */
let language: Language = "fr";

/** Rebuilt on language change rather than per call — Intl constructors are not cheap. */
let formatters = buildFormatters(language);

function buildFormatters(lang: Language) {
  const locale = LOCALE[lang];
  return {
    date: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),
    longDate: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }),
    monthYear: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }),
    number: new Intl.NumberFormat(locale),
    currency: new Intl.NumberFormat(locale, { style: "currency", currency: "DZD", maximumFractionDigits: 2 }),
    percent: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
  };
}

export function setFormatLanguage(lang: Language): void {
  if (lang === language) return;
  language = lang;
  formatters = buildFormatters(lang);
}

export function formatLanguage(): Language {
  return language;
}

/**
 * `Intl`'s ar-DZ formatters embed invisible bidi control characters (RLM,
 * ALM, LRM…) in their own output to keep mixed number/text runs ordered
 * correctly *by themselves*, sitting loose in a French sentence. But every
 * date and quantity in this app is rendered inside a table cell that already
 * carries its own `direction: ltr; unicode-bidi: isolate` (see index.css) —
 * and an embedded RLM inside "02/09/2026" still drives the bidi algorithm
 * regardless of that container's direction, splitting the date into
 * "02" + "2026/09/" on screen. Stripping the marks here and letting the CSS
 * isolation own the direction is what makes the isolation actually work.
 */
// eslint-disable-next-line no-control-regex -- LRM, RLM, ALM, LRE/RLE/PDF/LRO/RLO, LRI/RLI/FSI/PDI
const BIDI_CONTROL_CHARS = /[‎‏؜‪-‮⁦-⁩]/g;

function stripBidiControls(value: string): string {
  return value.replace(BIDI_CONTROL_CHARS, "");
}

/** Accepts either a plain "YYYY-MM-DD" date or a full ISO datetime (as the backend returns). */
export function formatDate(iso: string): string {
  const value = iso.includes("T") ? iso : `${iso}T00:00:00`;
  return stripBidiControls(formatters.date.format(new Date(value)));
}

/** "3 septembre 2026" / "٣ سبتمبر ٢٠٢٦"-shaped — for a heading, not a table cell. */
export function formatLongDate(iso: string): string {
  const value = iso.includes("T") ? iso : `${iso}T00:00:00`;
  return stripBidiControls(formatters.longDate.format(new Date(value)));
}

/** "septembre 2026" — the month picker and the dashboard heading. */
export function formatMonthYear(iso: string): string {
  const value = iso.length === 7 ? `${iso}-01T00:00:00` : iso.includes("T") ? iso : `${iso}T00:00:00`;
  return stripBidiControls(formatters.monthYear.format(new Date(value)));
}

/** "Jeudi 3 septembre" — the top bar. */
export function formatWeekday(date: Date): string {
  return stripBidiControls(formatters.weekday.format(date));
}

export function formatNumber(value: number): string {
  return stripBidiControls(formatters.number.format(value));
}

export function formatQuantity(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

export function formatCurrency(value: number): string {
  return stripBidiControls(formatters.currency.format(value));
}

export function formatPercent(fraction: number): string {
  return stripBidiControls(formatters.percent.format(fraction));
}
