import type { ProductionStatus } from "../../lib/productionApi";
import type { TranslationKey } from "../../lib/i18n";

/**
 * The shift written on a batch stays the French word — it is stored on every
 * past batch and grouped on by the losses report — while its label follows the
 * interface language.
 */
export const SHIFTS: Array<{ value: string; key: TranslationKey }> = [
  { value: "Matin", key: "shift.morning" },
  { value: "Après-midi", key: "shift.afternoon" },
  { value: "Nuit", key: "shift.night" },
];

/** One editable material row in the new-batch form / add-materials modal. */
export interface MaterialLine {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  stockBatchId: string | null;
  batchNumber: string | null;
  /**
   * What one unit of this material costs, read from the stock it will be
   * drawn from — the lot's own cost when the material is lot-tracked, the
   * article's weighted average otherwise. Display only: the backend prices
   * every line again from the same stock when it writes the batch, so the
   * number the factory saw and the number recorded come from one source.
   */
  unitCost: number | null;
}

export const emptyMaterialLine = (): MaterialLine => ({
  itemId: "",
  itemName: "",
  unit: "",
  quantity: 0,
  stockBatchId: null,
  batchNumber: null,
  unitCost: null,
});

/** What a set of material lines costs — the raw-material cost of a batch. */
export function materialLinesCost(lines: MaterialLine[]): number {
  return lines.reduce((sum, line) => sum + (line.unitCost ?? 0) * line.quantity, 0);
}

/** Lines drawn from stock nobody has ever priced — the total above is short by their value. */
export function unpricedLines(lines: MaterialLine[]): MaterialLine[] {
  return lines.filter((line) => line.itemId && line.quantity > 0 && line.unitCost === null);
}

/**
 * How each status is coloured. "Investigation requise" is the only tone that
 * shouts — the whole point of the neutral vocabulary is that an unexplained
 * gap gets attention without the record itself accusing anyone.
 */
export const STATUS_TONE: Record<ProductionStatus, "ok" | "warn" | "danger" | "neutral"> = {
  PLANNED: "neutral",
  IN_PROGRESS: "warn",
  COMPLETED: "ok",
  INVESTIGATION: "danger",
  CLOSED: "ok",
  CANCELLED: "neutral",
};

/** Rates come back as 0–1 fractions; the factory reads percentages. */
export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1).replace(".", ",")} %`;
}

/**
 * Neutral, operational wording for the variance — never an accusation.
 * A negative gap (more counted than announced) is just as much a reason to
 * look as a positive one.
 */
export function describeVariance(unknown: number | null): { key: TranslationKey; count: number } {
  if (unknown === null) return { key: "prod.outputNotDeclared", count: 0 };
  if (unknown === 0) return { key: "prod.fullyAccounted", count: 0 };
  if (unknown > 0) return { key: "prod.unaccountedCount", count: unknown };
  return { key: "prod.surplusCount", count: Math.abs(unknown) };
}
