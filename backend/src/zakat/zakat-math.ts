/**
 * Zakat arithmetic and the Hijri calendar conversion it needs for the
 * lunar hawl — no Nest, no Prisma, like payroll-math.ts and sales-math.ts.
 * Unit tested in zakat-math.spec.ts.
 *
 * Nothing derived here is ever stored: a ZakatCalculation row keeps only the
 * inputs the gérant typed in (or that were auto-pulled at the time), and
 * every total, the nisab comparison, and the due date are recomputed on
 * every read. Same reasoning as payroll-math.ts's tenure/pay estimate.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const ZAKAT_METHODOLOGIES = ['LUNAR', 'SOLAR'] as const;
export type ZakatMethodology = (typeof ZAKAT_METHODOLOGIES)[number];

export const ZAKAT_METHODOLOGY_LABELS: Record<ZakatMethodology, string> = {
  LUNAR: 'Année lunaire (hégirienne) — hawl standard',
  SOLAR: 'Année solaire (grégorienne) — méthode alternative',
};

export const ZAKAT_PAYMENT_STATUSES = ['NOT_PAID', 'PARTIALLY_PAID', 'PAID'] as const;
export type ZakatPaymentStatus = (typeof ZAKAT_PAYMENT_STATUSES)[number];

export const ZAKAT_PAYMENT_STATUS_LABELS: Record<ZakatPaymentStatus, string> = {
  NOT_PAID: 'Non payée',
  PARTIALLY_PAID: 'Partiellement payée',
  PAID: 'Payée',
};

/** Nisab is the value of 85 g of gold — the standard threshold for trade wealth. */
export const GOLD_NISAB_GRAMS = 85;

/** The widely-used standard rate for monetary wealth and trade assets. */
export const DEFAULT_ZAKAT_RATE = 0.025;

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export interface ZakatInputs {
  cash: number;
  bank: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  receivablesValue: number;
  otherAssets: number;
  deductions: number;
  goldPricePerGram: number;
  zakatRate: number;
}

export interface ZakatTotals {
  cashAndBank: number;
  totalAssets: number;
  nisabValue: number;
  zakatableBase: number;
  belowNisab: boolean;
  zakatDue: number;
}

/**
 * The chain from raw inputs to ZAKAT DUE, in one call — what both the
 * dashboard and the calculation screen show. A negative net base (deductions
 * exceeding assets) floors at zero rather than producing a negative "due".
 */
export function computeZakatTotals(inputs: ZakatInputs): ZakatTotals {
  const cashAndBank = round(inputs.cash + inputs.bank);
  const totalAssets = round(
    cashAndBank + inputs.finishedGoodsValue + inputs.rawMaterialsValue + inputs.receivablesValue + inputs.otherAssets,
  );
  const zakatableBase = round(Math.max(0, totalAssets - inputs.deductions));
  const nisabValue = round(GOLD_NISAB_GRAMS * inputs.goldPricePerGram);
  const belowNisab = zakatableBase < nisabValue;
  const zakatDue = belowNisab ? 0 : round(zakatableBase * inputs.zakatRate);
  return { cashAndBank, totalAssets, nisabValue, zakatableBase, belowNisab, zakatDue };
}

export function paymentStatusOf(zakatDue: number, amountPaid: number): ZakatPaymentStatus {
  if (zakatDue <= 0) return 'PAID';
  if (amountPaid <= 0) return 'NOT_PAID';
  if (amountPaid >= zakatDue) return 'PAID';
  return 'PARTIALLY_PAID';
}

// ---------------------------------------------------------------------------
// Hijri calendar — the tabular (arithmetic) Islamic calendar
// ---------------------------------------------------------------------------

/**
 * A deterministic arithmetic approximation of the Hijri calendar (the
 * "tabular" civil calendar), not a moon-sighting-based one — the same
 * "planning estimate, not a legal ruling" caveat as payroll-math.ts's IRG
 * brackets. It can be off by a day or two from the locally observed
 * calendar; the UI says so wherever a Hijri date appears.
 */
export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export const HIJRI_MONTH_NAMES = [
  'Mouharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' ath-Thani",
  'Joumada al-Oula',
  'Joumada ath-Thania',
  'Rajab',
  "Cha'ban",
  'Ramadan',
  'Chawwal',
  "Dhou al-Qi'da",
  'Dhou al-Hijja',
] as const;

/** Julian Day Number of 1 Muharram, year 1 AH — the tabular calendar's epoch. */
const ISLAMIC_EPOCH_JDN = 1948440;

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function jdnToHijri(jdn: number): HijriDate {
  let l = jdn - ISLAMIC_EPOCH_JDN + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

function hijriToJDN(h: HijriDate): number {
  return h.day + Math.ceil(29.5 * (h.month - 1)) + (h.year - 1) * 354 + Math.floor((3 + 11 * h.year) / 30) + ISLAMIC_EPOCH_JDN - 1;
}

/** UTC midnight of a Gregorian calendar date, to keep day arithmetic timezone-free. */
function toUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function gregorianToHijri(date: Date): HijriDate {
  const jdn = gregorianToJDN(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  return jdnToHijri(jdn);
}

export function hijriToGregorian(hijri: HijriDate): Date {
  const { year, month, day } = jdnToGregorian(hijriToJDN(hijri));
  return toUtcDate(year, month, day);
}

export function formatHijri(hijri: HijriDate): string {
  return `${hijri.day} ${HIJRI_MONTH_NAMES[hijri.month - 1]} ${hijri.year}`;
}

/**
 * The Zakat due date: one hawl after `calculationDate`. Lunar advances the
 * Hijri year by one (the standard hawl); solar advances the Gregorian year
 * by one (the alternative methodology some businesses use for bookkeeping
 * simplicity).
 */
export function computeDueDate(calculationDate: Date, methodology: ZakatMethodology): Date {
  if (methodology === 'SOLAR') {
    return toUtcDate(calculationDate.getUTCFullYear() + 1, calculationDate.getUTCMonth() + 1, calculationDate.getUTCDate());
  }
  const hijri = gregorianToHijri(calculationDate);
  return hijriToGregorian({ ...hijri, year: hijri.year + 1 });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
