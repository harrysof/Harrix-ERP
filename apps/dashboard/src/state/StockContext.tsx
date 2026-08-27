import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Batch, InventoryTypeId, Item, Movement } from "../lib/types";
import { loadFromStorage, saveToStorage } from "../lib/storage";
import { seedBatches, seedItems, seedMovements } from "../lib/seedData";

const STORAGE_KEY = "chelma.stock.v1";

interface StockSnapshot {
  items: Item[];
  batches: Batch[];
  movements: Movement[];
}

function freshSnapshot(): StockSnapshot {
  return { items: seedItems, batches: seedBatches, movements: seedMovements };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewItemInput {
  inventoryTypeId: InventoryTypeId;
  name: string;
  reference: string;
  unit: string;
  reorderThreshold: number;
}

export interface ReceiveStockInput {
  itemId: string;
  quantity: number;
  date: string;
  supplierName: string | null;
  batchNumber?: string;
  expiryDate?: string | null;
}

export interface LogUsageInput {
  itemId: string;
  batchId: string | null;
  quantity: number;
  date: string;
  reason: string;
}

interface StockContextValue {
  items: Item[];
  batches: Batch[];
  movements: Movement[];
  addItem: (input: NewItemInput) => void;
  receiveStock: (input: ReceiveStockInput) => void;
  logUsage: (input: LogUsageInput) => void;
  resetDemoData: () => void;
}

const StockContext = createContext<StockContextValue | null>(null);

export function StockProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StockSnapshot>(() => loadFromStorage(STORAGE_KEY, freshSnapshot()));

  useEffect(() => {
    saveToStorage(STORAGE_KEY, snapshot);
  }, [snapshot]);

  const addItem = useCallback((input: NewItemInput) => {
    setSnapshot((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newId("item"),
          inventoryTypeId: input.inventoryTypeId,
          name: input.name,
          reference: input.reference,
          unit: input.unit,
          reorderThreshold: input.reorderThreshold,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ],
    }));
  }, []);

  const receiveStock = useCallback((input: ReceiveStockInput) => {
    setSnapshot((prev) => {
      let batchId: string | null = null;
      const newBatches = [...prev.batches];

      if (input.batchNumber) {
        batchId = newId("batch");
        newBatches.push({
          id: batchId,
          itemId: input.itemId,
          batchNumber: input.batchNumber,
          receivedDate: input.date,
          expiryDate: input.expiryDate ?? null,
        });
      }

      const movement: Movement = {
        id: newId("mv"),
        itemId: input.itemId,
        batchId,
        direction: "in",
        quantity: input.quantity,
        date: input.date,
        supplierName: input.supplierName,
        reason: null,
        createdAt: new Date().toISOString(),
      };

      return { ...prev, batches: newBatches, movements: [...prev.movements, movement] };
    });
  }, []);

  const logUsage = useCallback((input: LogUsageInput) => {
    setSnapshot((prev) => {
      const movement: Movement = {
        id: newId("mv"),
        itemId: input.itemId,
        batchId: input.batchId,
        direction: "out",
        quantity: input.quantity,
        date: input.date,
        supplierName: null,
        reason: input.reason,
        createdAt: new Date().toISOString(),
      };
      return { ...prev, movements: [...prev.movements, movement] };
    });
  }, []);

  const resetDemoData = useCallback(() => {
    setSnapshot(freshSnapshot());
  }, []);

  const value = useMemo<StockContextValue>(
    () => ({ ...snapshot, addItem, receiveStock, logUsage, resetDemoData }),
    [snapshot, addItem, receiveStock, logUsage, resetDemoData],
  );

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock(): StockContextValue {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock doit être utilisé à l'intérieur de <StockProvider>");
  return ctx;
}
