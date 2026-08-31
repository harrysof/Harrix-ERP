/**
 * The units of measure an article can be counted in.
 *
 * This list exists because the unit field used to be free text, and free text
 * accepted "100" — which then read back as "0 100" in the stock table, a
 * quantity with a number for a unit. A unit is a closed vocabulary in
 * practice, so it is offered as one.
 *
 * It stays open at the edges: `AUTRE` lets a factory name a unit nobody
 * anticipated (a "botte", a "touret"), because the alternative is somebody
 * choosing the wrong unit to get past the form. What is refused is a unit
 * that is only digits — see `isValidUnit`.
 */
export interface UnitGroup {
  label: string;
  units: string[];
}

export const UNIT_GROUPS: UnitGroup[] = [
  {
    label: "Comptage",
    units: ["pièce", "paire", "lot", "boîte", "carton", "palette", "rouleau", "sachet", "bidon", "fût"],
  },
  { label: "Masse", units: ["kg", "g", "tonne"] },
  { label: "Volume", units: ["litre", "ml", "m³"] },
  { label: "Longueur", units: ["m", "cm", "mm"] },
  { label: "Surface", units: ["m²", "dm²"] },
];

/** The sentinel value of the "Autre…" option — never stored on an article. */
export const CUSTOM_UNIT = "__autre__";

export const ALL_UNITS: string[] = UNIT_GROUPS.flatMap((group) => group.units);

export function isKnownUnit(unit: string): boolean {
  return ALL_UNITS.includes(unit.trim());
}

/**
 * A unit has to name something. Digits alone ("100") are the mistake this
 * whole module exists to stop: they produce quantities like "0 100" and a
 * cost label reading "DZD / 100".
 */
export function isValidUnit(unit: string): boolean {
  const value = unit.trim();
  return value.length > 0 && /\p{L}/u.test(value);
}
