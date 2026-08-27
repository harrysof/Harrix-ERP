import type { InventoryTypeConfig, InventoryTypeId } from "./types";

/**
 * The four inventories, as data rather than as separate hardcoded screens.
 * A future factory with a different set of inventories only needs a different
 * list here — nothing downstream should assume there are exactly four.
 */
export const INVENTORY_TYPES: InventoryTypeConfig[] = [
  {
    id: "chemicals",
    label: "Produits chimiques",
    singular: "produit chimique",
    description: "Matière première pour la production. Suivi par lot (FIFO) à cause de la péremption.",
    hasBatches: true,
    hasExpiry: true,
    isProductionInput: true,
    defaultUnit: "kg",
  },
  {
    id: "tige",
    label: "Tige des chaussures",
    singular: "tige",
    description: "Matière première pour la production. Pas de péremption, pas de lots.",
    hasBatches: false,
    hasExpiry: false,
    isProductionInput: true,
    defaultUnit: "pièce",
  },
  {
    id: "spare-parts",
    label: "Pièces détachées",
    singular: "pièce détachée",
    description: "Stock de maintenance des machines. N'entre jamais dans la production.",
    hasBatches: false,
    hasExpiry: false,
    isProductionInput: false,
    defaultUnit: "pièce",
  },
  {
    id: "finished-goods",
    label: "Produits finis",
    singular: "produit fini",
    description: "Sortie de la production : 1er choix, 2ème choix et rebut.",
    hasBatches: false,
    hasExpiry: false,
    isProductionInput: false,
    defaultUnit: "paire",
  },
];

export function getInventoryType(id: InventoryTypeId): InventoryTypeConfig {
  const found = INVENTORY_TYPES.find((t) => t.id === id);
  if (!found) throw new Error(`Type d'inventaire inconnu : ${id}`);
  return found;
}
