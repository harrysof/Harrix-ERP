export interface MaterialLineRecord {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  batchId: string | null;
  batchNumber: string | null;
}

export interface ProductionRun {
  id: string;
  date: string;
  productItemId: string;
  productName: string;
  worker: string;
  machine: string;
  shift: string;
  materials: MaterialLineRecord[];
  premierChoix: number;
  deuxiemeChoix: number;
  rebut: number;
  machineQuantity: number;
  gap: number;
  gapReason: string | null;
  createdAt: string;
}

export const SHIFTS = ["Matin", "Après-midi", "Nuit"];

export const GAP_REASONS = ["Casse", "Vol suspecté", "Erreur de comptage", "Autre"];
