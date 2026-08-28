/**
 * Pure, framework-free production arithmetic. No Prisma, no HTTP — plain data
 * in, plain data out, exactly like stock-math.ts, so it is unit-testable
 * without a database (see production-math.spec.ts).
 *
 * This file answers the factory's single most important question: a machine
 * says it made 120 units, the floor accounted for 110 — where are the other
 * 10? Everything here is computed on read; nothing derived is ever stored.
 */

/** Batch lifecycle. Plain strings — see schema.prisma's note on Prisma enums. */
export const PRODUCTION_STATUSES = [
  /** Created, nothing consumed or produced yet. */
  'PLANNED',
  /** Materials are being consumed; output not declared. */
  'IN_PROGRESS',
  /** Output declared and fully accounted for (variance = 0). */
  'COMPLETED',
  /** Output declared with a non-zero variance and no conclusion yet. */
  'INVESTIGATION',
  /** Variance investigated and signed off with a note. */
  'CLOSED',
  /** Abandoned. Materials already consumed stay consumed. */
  'CANCELLED',
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

/** Statuses that mean "this batch is finished, stop counting it as running". */
export const TERMINAL_STATUSES: ProductionStatus[] = ['COMPLETED', 'CLOSED', 'CANCELLED'];

export interface OutputFigures {
  expectedQuantity: number;
  firstChoice: number;
  secondChoice: number;
  waste: number;
  outputDeclared: boolean;
}

export interface Variance {
  /** first + second + waste — everything the floor could actually point at. */
  accountedOutput: number;
  /**
   * expected - accounted. Null until the output has been declared, because
   * "nothing counted yet" is not the same claim as "everything is missing".
   * Negative means more units were counted than the machine announced, which
   * is just as much a reason to look as a positive gap.
   */
  unknown: number | null;
  /** True when there is a gap in either direction and nobody has explained it. */
  needsInvestigation: boolean;
}

/** Rates, all expressed as a share of the expected (machine-announced) output. */
export interface ProductionRates {
  yieldRate: number | null;
  secondChoiceRate: number | null;
  wasteRate: number | null;
  unknownRate: number | null;
}

export function getAccountedOutput(b: OutputFigures): number {
  return round(b.firstChoice + b.secondChoice + b.waste);
}

/**
 * Unknown Units = Expected Output - First Choice - Second Choice - Waste.
 *
 * The formula the whole module exists for. Returns null when output has not
 * been declared yet.
 */
export function getUnknownUnits(b: OutputFigures): number | null {
  if (!b.outputDeclared) return null;
  return round(b.expectedQuantity - b.firstChoice - b.secondChoice - b.waste);
}

export function getVariance(b: OutputFigures, hasVarianceNote = false): Variance {
  const unknown = getUnknownUnits(b);
  return {
    accountedOutput: getAccountedOutput(b),
    unknown,
    needsInvestigation: unknown !== null && unknown !== 0 && !hasVarianceNote,
  };
}

export function getRates(b: OutputFigures): ProductionRates {
  if (!b.outputDeclared || b.expectedQuantity <= 0) {
    return { yieldRate: null, secondChoiceRate: null, wasteRate: null, unknownRate: null };
  }
  const unknown = getUnknownUnits(b) ?? 0;
  return {
    yieldRate: rate(b.firstChoice, b.expectedQuantity),
    secondChoiceRate: rate(b.secondChoice, b.expectedQuantity),
    wasteRate: rate(b.waste, b.expectedQuantity),
    unknownRate: rate(unknown, b.expectedQuantity),
  };
}

/** The status a batch lands in once its output figures are declared. */
export function statusAfterOutput(b: OutputFigures): ProductionStatus {
  return getUnknownUnits(b) === 0 ? 'COMPLETED' : 'INVESTIGATION';
}

export interface LossTotals {
  batchCount: number;
  expected: number;
  firstChoice: number;
  secondChoice: number;
  waste: number;
  accounted: number;
  unknown: number;
  rates: ProductionRates;
}

/**
 * Roll a set of batches up into one set of totals and rates. Only batches with
 * declared output contribute — a planned batch has no losses to report yet.
 */
export function summarizeLosses(batches: OutputFigures[]): LossTotals {
  const declared = batches.filter((b) => b.outputDeclared);
  const sum = (pick: (b: OutputFigures) => number) => round(declared.reduce((acc, b) => acc + pick(b), 0));

  const expected = sum((b) => b.expectedQuantity);
  const firstChoice = sum((b) => b.firstChoice);
  const secondChoice = sum((b) => b.secondChoice);
  const waste = sum((b) => b.waste);
  const accounted = round(firstChoice + secondChoice + waste);
  const unknown = round(expected - accounted);

  return {
    batchCount: declared.length,
    expected,
    firstChoice,
    secondChoice,
    waste,
    accounted,
    unknown,
    rates:
      expected > 0
        ? {
            yieldRate: rate(firstChoice, expected),
            secondChoiceRate: rate(secondChoice, expected),
            wasteRate: rate(waste, expected),
            unknownRate: rate(unknown, expected),
          }
        : { yieldRate: null, secondChoiceRate: null, wasteRate: null, unknownRate: null },
  };
}

/**
 * Group batches by some dimension (product, machine, month…) and summarise
 * each group. Sorted worst-first by unknown + waste, because the point of the
 * losses view is to surface recurring problems, not to list everything evenly.
 */
export function groupLosses<T extends OutputFigures>(
  batches: T[],
  keyOf: (b: T) => string,
  labelOf: (b: T) => string,
): Array<{ key: string; label: string } & LossTotals> {
  const groups = new Map<string, { label: string; batches: T[] }>();
  for (const b of batches) {
    const key = keyOf(b);
    const group = groups.get(key);
    if (group) group.batches.push(b);
    else groups.set(key, { label: labelOf(b), batches: [b] });
  }

  return [...groups.entries()]
    .map(([key, { label, batches: group }]) => ({ key, label, ...summarizeLosses(group) }))
    .sort((a, b) => Math.abs(b.unknown) + b.waste - (Math.abs(a.unknown) + a.waste));
}

/** Two decimals, to keep float noise (0.1 + 0.2) out of the factory's numbers. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function rate(part: number, whole: number): number {
  return Math.round((part / whole) * 10000) / 10000;
}
