import type { ProductionStatus } from "../../lib/productionApi";

export const SHIFTS = ["Matin", "Après-midi", "Nuit"];

/** One editable material row in the new-batch form / add-materials modal. */
export interface MaterialLine {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  stockBatchId: string | null;
  batchNumber: string | null;
}

export const emptyMaterialLine = (): MaterialLine => ({
  itemId: "",
  itemName: "",
  unit: "",
  quantity: 0,
  stockBatchId: null,
  batchNumber: null,
});

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
export function describeVariance(unknown: number | null): string {
  if (unknown === null) return "Sortie non déclarée";
  if (unknown === 0) return "Entièrement justifié";
  if (unknown > 0) return `${unknown} non comptabilisées`;
  return `${Math.abs(unknown)} en excédent`;
}
