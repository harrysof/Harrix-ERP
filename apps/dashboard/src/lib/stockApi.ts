import { api } from "./api";
import type { InventoryTypeConfig, InventoryTypeId } from "./types";

export interface ApiItem {
  id: string;
  inventoryTypeId: string;
  name: string;
  reference: string;
  unit: string;
  reorderThreshold: number;
  archived: boolean;
  createdAt: string;
  inventoryType: InventoryTypeConfig;
  quantity: number;
  low: boolean;
  fifoBatch: ApiBatch | null;
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
}

export function fetchInventoryTypes(): Promise<InventoryTypeConfig[]> {
  return api.get<Array<InventoryTypeConfig & { id: string }>>("/settings/inventory-types");
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

export function createItem(input: { inventoryTypeId: string; name: string; reference: string; unit: string; reorderThreshold: number }) {
  return api.post<ApiItem>("/stock/items", input);
}

export function updateItem(id: string, input: { name?: string; reference?: string; unit?: string; reorderThreshold?: number }) {
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
  input: { quantity: number; date: string; supplierId: string | null; batchNumber?: string; expiryDate?: string | null },
) {
  return api.post(`/stock/items/${itemId}/receive`, input);
}

export function logUsage(itemId: string, input: { quantity: number; date: string; reason: string; batchId?: string | null }) {
  return api.post(`/stock/items/${itemId}/usage`, input);
}
