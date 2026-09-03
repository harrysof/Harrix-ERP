/**
 * The four inventories the factory started with. They are NOT the whole list:
 * inventory types are rows, not an enum (see backend schema.prisma), and the
 * Stock tab can create more — so anywhere a key is compared, an unknown one
 * has to stay legal. The union is kept for the built-in keys the code
 * genuinely special-cases (finished goods, mainly); `(string & {})` keeps the
 * autocomplete while accepting anything the gérant invents.
 */
export type BuiltInInventoryTypeId = "chemicals" | "tige" | "spare-parts" | "finished-goods";

export type InventoryTypeId = BuiltInInventoryTypeId | (string & {});

/** Mirrors the backend's InventoryType row — see backend/prisma/schema.prisma. */
export interface InventoryTypeConfig {
  id: string;
  key: InventoryTypeId;
  label: string;
  singular: string;
  description: string;
  /**
   * Arabic variants of the three fields above, edited alongside them in
   * Settings — optional, since a factory that only ever types French for a
   * custom inventory shouldn't be forced to fill these in. Display code
   * never reads these directly; use lib/inventoryTypeI18n.ts, which falls
   * back to the French value when one is missing.
   */
  labelAr?: string | null;
  singularAr?: string | null;
  descriptionAr?: string | null;
  hasBatches: boolean;
  hasExpiry: boolean;
  isProductionInput: boolean;
  hasColor: boolean;
  hasSize: boolean;
  hasDescription: boolean;
  hasMachineInfo: boolean;
  hasGender: boolean;
  hasPrice: boolean;
  hasQuality: boolean;
  defaultUnit: string;
  sortOrder: number;
}
