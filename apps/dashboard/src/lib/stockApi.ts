import { api } from "./api";
import type { InventoryTypeConfig, InventoryTypeId } from "./types";

export interface ApiItem {
  id: string;
  inventoryTypeId: string;
  name: string;
  reference: string;
  unit: string;
  reorderThreshold: number;
  photoUrl: string | null;
  color: string | null;
  size: string | null;
  description: string | null;
  machine: string | null;
  compatibility: string | null;
  manufacturer: string | null;
  location: string | null;
  criticality: string | null;
  gender: string | null;
  price: number | null;
  /** Standard purchase cost per unit, in DZD, as typed on the article. */
  unitCost: number | null;
  archived: boolean;
  createdAt: string;
  inventoryType: InventoryTypeConfig;
  quantity: number;
  purchased: number;
  used: number;
  supplier: { id: string; name: string } | null;
  low: boolean;
  stockStatus: "good" | "mid" | "low";
  fifoBatch: ApiBatch | null;
  recommendedBatch: ApiBatch | null;
  /**
   * Valuation, all computed by the backend from the movement ledger and never
   * stored — the money mirror of `quantity`. See backend stock-math.ts,
   * "COSTING & VALUATION".
   */
  averageUnitCost: number | null;
  stockValue: number | null;
  /** How much of what came in carries a known price — the average's basis. */
  valuedQuantity: number;
  /** How much came in with no price at all. Non-zero means the average is partial. */
  uncostedQuantity: number;
  /** What everything ever received actually cost, in DZD. */
  purchasedValue: number;
  /** Where that value came from: purchases, supplier orders, receptions, production. */
  costSources: ApiCostSource[];
  /** Finished goods only (InventoryType.hasQuality): remaining per production class. */
  qualityBreakdown?: { "1er": number; "2ème": number; rebut: number };
  /** Finished goods only: units in stock no production record explains. */
  unaccounted?: number;
  /** True only when the item has no movements and no production references. */
  deletable: boolean;
}

export interface ApiBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  receivedDate: string;
  expiryDate: string | null;
  remaining: number;
  status: "expired" | "warning" | "ok" | "none";
  /** What this particular lot cost per unit. Only sent by /items/:id/batches. */
  unitCost?: number | null;
}

/** One provenance bucket of an item's value — see backend getCostSources. */
export interface ApiCostSource {
  source: "MANUAL" | "SUPPLIER_ORDER" | "PURCHASE" | "PRODUCTION" | "SALE" | string;
  label: string;
  quantity: number;
  value: number;
  averageUnitCost: number | null;
  /** The documents behind it, e.g. ["BC-2026-0007"]. */
  references: string[];
  uncostedQuantity: number;
}

export interface ApiMovement {
  id: string;
  itemId: string;
  batchId: string | null;
  direction: "IN" | "OUT";
  quantity: number;
  date: string;
  supplierId: string | null;
  reason: string | null;
  machine: string | null;
  maintenanceRef: string | null;
  employee: string | null;
  notes: string | null;
  quality: string | null;
  /** What one unit cost on this movement, in DZD. Null when it was never priced. */
  unitCost: number | null;
  /** Where it came from — see backend MOVEMENT_SOURCES. */
  sourceType: string | null;
  /** The document behind it, e.g. "BC-2026-0007" or "LOT-2026-0012". */
  sourceRef: string | null;
  createdAt: string;
  batch: { batchNumber: string } | null;
  supplier: { name: string } | null;
  /** Present only where the endpoint joins it (supplier detail); absent elsewhere. */
  item?: { id: string; name: string; reference: string; unit: string };
}

export interface StockSummary {
  totalItems: number;
  lowStockCount: number;
  lowStockItems: Array<{ id: string; name: string; unit: string; quantity: number; reorderThreshold: number; inventoryTypeLabel: string }>;
  watchBatchCount: number;
  /** Weighted-average value of everything on the shelves, in DZD. */
  stockValue: number;
}

export function fetchInventoryTypes(): Promise<InventoryTypeConfig[]> {
  return api.get<Array<InventoryTypeConfig & { id: string }>>("/settings/inventory-types");
}

/**
 * What an inventory is created or edited with. The flags default to false and
 * `sortOrder` to "after the existing tabs" on the backend, so a caller only
 * has to name the inventory and its unit.
 */
export type InventoryTypeInput = Partial<Omit<InventoryTypeConfig, "id" | "key">> &
  Pick<InventoryTypeConfig, "label" | "singular" | "defaultUnit">;

/**
 * Adds an inventory beyond the four the factory started with. The backend has
 * always stored these as rows rather than an enum — this is the door to it.
 */
export function createInventoryType(input: InventoryTypeInput & { key: string }): Promise<InventoryTypeConfig> {
  return api.post<InventoryTypeConfig>("/settings/inventory-types", input);
}

/** The machine key is never editable — everything else is. */
export function updateInventoryType(id: string, input: Partial<InventoryTypeInput>): Promise<InventoryTypeConfig> {
  return api.patch<InventoryTypeConfig>(`/settings/inventory-types/${id}`, input);
}

/** Only succeeds for an inventory that holds no articles at all. */
export function deleteInventoryType(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/settings/inventory-types/${id}`);
}

export function fetchItems(inventoryTypeId?: InventoryTypeId, includeArchived = false): Promise<ApiItem[]> {
  const params = new URLSearchParams();
  if (inventoryTypeId) params.set("inventoryTypeId", inventoryTypeId);
  if (includeArchived) params.set("includeArchived", "true");
  const query = params.toString();
  return api.get<ApiItem[]>(`/stock/items${query ? `?${query}` : ""}`);
}

export function fetchItem(id: string): Promise<ApiItem> {
  return api.get<ApiItem>(`/stock/items/${id}`);
}

export function fetchBatches(itemId: string): Promise<ApiBatch[]> {
  return api.get<ApiBatch[]>(`/stock/items/${itemId}/batches`);
}

export function fetchMovements(itemId: string): Promise<ApiMovement[]> {
  return api.get<ApiMovement[]>(`/stock/items/${itemId}/movements`);
}

export function fetchStockSummary(): Promise<StockSummary> {
  return api.get<StockSummary>("/stock/summary");
}

export function createItem(input: {
  inventoryTypeId: string;
  name: string;
  reference: string;
  unit: string;
  reorderThreshold: number;
  photoUrl?: string | null;
  color?: string | null;
  size?: string | null;
  description?: string | null;
  machine?: string | null;
  compatibility?: string | null;
  manufacturer?: string | null;
  location?: string | null;
  criticality?: string | null;
  gender?: string | null;
  price?: number | null;
  unitCost?: number | null;
}) {
  return api.post<ApiItem>("/stock/items", input);
}

export function updateItem(id: string, input: {
  name?: string;
  reference?: string;
  unit?: string;
  reorderThreshold?: number;
  photoUrl?: string | null;
  color?: string | null;
  size?: string | null;
  description?: string | null;
  machine?: string | null;
  compatibility?: string | null;
  manufacturer?: string | null;
  location?: string | null;
  criticality?: string | null;
  gender?: string | null;
  price?: number | null;
  unitCost?: number | null;
}) {
  return api.patch<ApiItem>(`/stock/items/${id}`, input);
}

/**
 * Hard delete. The backend allows it only for an item with no history at all;
 * anything else comes back as a 409 telling you to archive instead.
 */
export function deleteItem(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/stock/items/${id}`);
}

export function setItemArchived(id: string, archived: boolean) {
  return api.patch<ApiItem>(`/stock/items/${id}/${archived ? "archive" : "unarchive"}`, {});
}

export function receiveStock(
  itemId: string,
  input: {
    quantity: number;
    date: string;
    supplierId: string | null;
    batchNumber?: string;
    expiryDate?: string | null;
    quality?: string | null;
    /** Price paid per unit on this delivery. Omitted, the backend falls back to the article's standard cost. */
    unitCost?: number | null;
  },
) {
  return api.post(`/stock/items/${itemId}/receive`, input);
}

export function logUsage(
  itemId: string,
  input: {
    quantity: number;
    date: string;
    reason: string;
    batchId?: string | null;
    machine?: string | null;
    maintenanceRef?: string | null;
    employee?: string | null;
    notes?: string | null;
    quality?: string | null;
  },
) {
  return api.post(`/stock/items/${itemId}/usage`, input);
}
