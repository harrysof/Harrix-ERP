export type InventoryTypeId = "chemicals" | "tige" | "spare-parts" | "finished-goods";

/** Mirrors the backend's InventoryType row — see backend/prisma/schema.prisma. */
export interface InventoryTypeConfig {
  id: string;
  key: InventoryTypeId;
  label: string;
  singular: string;
  description: string;
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
