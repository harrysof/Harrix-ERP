export type InventoryTypeId = "chemicals" | "tige" | "spare-parts" | "finished-goods";

export interface InventoryTypeConfig {
  id: InventoryTypeId;
  label: string;
  singular: string;
  description: string;
  /** Chemicals are tracked in dated batches so the oldest can be used first (FIFO). */
  hasBatches: boolean;
  /** Only batches can expire; the other inventories have no shelf life. */
  hasExpiry: boolean;
  isProductionInput: boolean;
  defaultUnit: string;
}

export interface Item {
  id: string;
  inventoryTypeId: InventoryTypeId;
  name: string;
  reference: string;
  unit: string;
  reorderThreshold: number;
  createdAt: string;
}

export interface Batch {
  id: string;
  itemId: string;
  batchNumber: string;
  receivedDate: string;
  expiryDate: string | null;
}

export type MovementDirection = "in" | "out";

export interface Movement {
  id: string;
  itemId: string;
  batchId: string | null;
  direction: MovementDirection;
  quantity: number;
  date: string;
  supplierName: string | null;
  reason: string | null;
  createdAt: string;
}

export type ExpiryStatus = "expired" | "warning" | "ok" | "none";

export interface BatchWithRemaining extends Batch {
  remaining: number;
  status: ExpiryStatus;
}
