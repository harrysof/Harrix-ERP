import { api } from "./api";
import type { InventoryTypeConfig } from "./types";

export interface ApiSupplierOrder {
  id: string;
  supplierId: string;
  supplier: { id: string; name: string };
  orderDate: string;
  status: "open" | "received";
  receivedDate: string | null;
  notes: string | null;
  createdAt: string;
  lines: Array<{
    id: string;
    itemId: string;
    quantityOrdered: number;
    batchNumber: string | null;
    expiryDate: string | null;
    item: {
      id: string;
      name: string;
      reference: string;
      unit: string;
      inventoryType: InventoryTypeConfig;
    };
  }>;
}

export interface SupplierOrderInput {
  supplierId: string;
  orderDate: string;
  notes?: string;
  lines: Array<{ itemId: string; quantityOrdered: number }>;
}

export interface ReceiveOrderInput {
  lines?: Array<{ lineId: string; batchNumber?: string; expiryDate?: string }>;
}

export function fetchSupplierOrders(): Promise<ApiSupplierOrder[]> {
  return api.get<ApiSupplierOrder[]>("/supplier-orders");
}

export function createSupplierOrder(input: SupplierOrderInput): Promise<ApiSupplierOrder> {
  return api.post<ApiSupplierOrder>("/supplier-orders", input);
}

export function receiveSupplierOrder(id: string, input: ReceiveOrderInput): Promise<ApiSupplierOrder> {
  return api.post<ApiSupplierOrder>(`/supplier-orders/${id}/receive`, input);
}