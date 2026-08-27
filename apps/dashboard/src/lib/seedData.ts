import type { Batch, Item, Movement } from "./types";

/**
 * Starting data for evaluating the app before real counts are loaded in
 * (see build plan, Phase 4: "Load real starting quantities with the stock
 * worker sitting next to you"). This is demonstration data only — the Stock
 * page has a visible "reset demo data" action so nobody mistakes it for a
 * real inventory.
 */

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const seedItems: Item[] = [
  // Produits chimiques
  { id: "item-colle", inventoryTypeId: "chemicals", name: "Colle néoprène", reference: "CH-001", unit: "kg", reorderThreshold: 20, createdAt: isoOffset(-90) },
  { id: "item-solvant", inventoryTypeId: "chemicals", name: "Solvant de nettoyage", reference: "CH-002", unit: "litre", reorderThreshold: 15, createdAt: isoOffset(-90) },
  { id: "item-vernis", inventoryTypeId: "chemicals", name: "Vernis de finition", reference: "CH-003", unit: "litre", reorderThreshold: 10, createdAt: isoOffset(-90) },

  // Tige des chaussures
  { id: "item-tige-40", inventoryTypeId: "tige", name: "Tige pointure 40", reference: "TG-040", unit: "pièce", reorderThreshold: 200, createdAt: isoOffset(-90) },
  { id: "item-tige-41", inventoryTypeId: "tige", name: "Tige pointure 41", reference: "TG-041", unit: "pièce", reorderThreshold: 200, createdAt: isoOffset(-90) },
  { id: "item-tige-42", inventoryTypeId: "tige", name: "Tige pointure 42", reference: "TG-042", unit: "pièce", reorderThreshold: 200, createdAt: isoOffset(-90) },

  // Pièces détachées
  { id: "item-courroie", inventoryTypeId: "spare-parts", name: "Courroie de transmission", reference: "PD-010", unit: "pièce", reorderThreshold: 3, createdAt: isoOffset(-90) },
  { id: "item-aiguille", inventoryTypeId: "spare-parts", name: "Aiguille de piqueuse", reference: "PD-011", unit: "pièce", reorderThreshold: 10, createdAt: isoOffset(-90) },
  { id: "item-roulement", inventoryTypeId: "spare-parts", name: "Roulement à billes", reference: "PD-012", unit: "pièce", reorderThreshold: 4, createdAt: isoOffset(-90) },

  // Produits finis — left empty on purpose; this screen fills up once
  // the Production module (a later phase) starts logging finished runs.
];

export const seedBatches: Batch[] = [
  { id: "batch-colle-1", itemId: "item-colle", batchNumber: "L-2401", receivedDate: isoOffset(-60), expiryDate: isoOffset(-5) },
  { id: "batch-colle-2", itemId: "item-colle", batchNumber: "L-2412", receivedDate: isoOffset(-10), expiryDate: isoOffset(20) },
  { id: "batch-solvant-1", itemId: "item-solvant", batchNumber: "L-2405", receivedDate: isoOffset(-40), expiryDate: isoOffset(200) },
  { id: "batch-vernis-1", itemId: "item-vernis", batchNumber: "L-2408", receivedDate: isoOffset(-25), expiryDate: isoOffset(15) },
];

export const seedMovements: Movement[] = [
  // Colle néoprène — two batches, the first nearly used up and already expired
  { id: "mv-1", itemId: "item-colle", batchId: "batch-colle-1", direction: "in", quantity: 40, date: isoOffset(-60), supplierName: "Sodichim", reason: null, createdAt: isoOffset(-60) },
  { id: "mv-2", itemId: "item-colle", batchId: "batch-colle-1", direction: "out", quantity: 35, date: isoOffset(-20), supplierName: null, reason: "Production", createdAt: isoOffset(-20) },
  { id: "mv-3", itemId: "item-colle", batchId: "batch-colle-2", direction: "in", quantity: 30, date: isoOffset(-10), supplierName: "Sodichim", reason: null, createdAt: isoOffset(-10) },

  // Solvant — comfortably stocked
  { id: "mv-4", itemId: "item-solvant", batchId: "batch-solvant-1", direction: "in", quantity: 25, date: isoOffset(-40), supplierName: "Sodichim", reason: null, createdAt: isoOffset(-40) },
  { id: "mv-5", itemId: "item-solvant", batchId: "batch-solvant-1", direction: "out", quantity: 8, date: isoOffset(-5), supplierName: null, reason: "Production", createdAt: isoOffset(-5) },

  // Vernis — below its threshold, to show the low-stock state
  { id: "mv-6", itemId: "item-vernis", batchId: "batch-vernis-1", direction: "in", quantity: 12, date: isoOffset(-25), supplierName: "Chimindus", reason: null, createdAt: isoOffset(-25) },
  { id: "mv-7", itemId: "item-vernis", batchId: "batch-vernis-1", direction: "out", quantity: 5, date: isoOffset(-3), supplierName: null, reason: "Production", createdAt: isoOffset(-3) },

  // Tiges — simple in/out, no batches
  { id: "mv-8", itemId: "item-tige-40", batchId: null, direction: "in", quantity: 600, date: isoOffset(-30), supplierName: "Fournitures Batna", reason: null, createdAt: isoOffset(-30) },
  { id: "mv-9", itemId: "item-tige-40", batchId: null, direction: "out", quantity: 250, date: isoOffset(-8), supplierName: null, reason: "Production", createdAt: isoOffset(-8) },
  { id: "mv-10", itemId: "item-tige-41", batchId: null, direction: "in", quantity: 500, date: isoOffset(-30), supplierName: "Fournitures Batna", reason: null, createdAt: isoOffset(-30) },
  { id: "mv-11", itemId: "item-tige-41", batchId: null, direction: "out", quantity: 350, date: isoOffset(-8), supplierName: null, reason: "Production", createdAt: isoOffset(-8) },
  { id: "mv-12", itemId: "item-tige-42", batchId: null, direction: "in", quantity: 150, date: isoOffset(-30), supplierName: "Fournitures Batna", reason: null, createdAt: isoOffset(-30) },

  // Pièces détachées
  { id: "mv-13", itemId: "item-courroie", batchId: null, direction: "in", quantity: 6, date: isoOffset(-70), supplierName: "MécaPièces", reason: null, createdAt: isoOffset(-70) },
  { id: "mv-14", itemId: "item-courroie", batchId: null, direction: "out", quantity: 4, date: isoOffset(-15), supplierName: null, reason: "Maintenance", createdAt: isoOffset(-15) },
  { id: "mv-15", itemId: "item-aiguille", batchId: null, direction: "in", quantity: 40, date: isoOffset(-70), supplierName: "MécaPièces", reason: null, createdAt: isoOffset(-70) },
  { id: "mv-16", itemId: "item-aiguille", batchId: null, direction: "out", quantity: 33, date: isoOffset(-2), supplierName: null, reason: "Maintenance", createdAt: isoOffset(-2) },
  { id: "mv-17", itemId: "item-roulement", batchId: null, direction: "in", quantity: 10, date: isoOffset(-70), supplierName: "MécaPièces", reason: null, createdAt: isoOffset(-70) },
];
