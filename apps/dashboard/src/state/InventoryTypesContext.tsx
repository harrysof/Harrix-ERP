import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { InventoryTypeConfig } from "../lib/types";
import { fetchInventoryTypes } from "../lib/stockApi";
import { ApiError } from "../lib/api";

interface InventoryTypesContextValue {
  types: InventoryTypeConfig[];
  loading: boolean;
  error: string | null;
  getType: (id: string) => InventoryTypeConfig | undefined;
  /** Refetch after an inventory is created, renamed or removed. */
  reload: () => Promise<void>;
}

const InventoryTypesContext = createContext<InventoryTypesContextValue | null>(null);

export function InventoryTypesProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState<InventoryTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchInventoryTypes();
      setTypes([...data].sort((a, b) => a.sortOrder - b.sortOrder));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger les types d'inventaire.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value: InventoryTypesContextValue = {
    types,
    loading,
    error,
    getType: (id) => types.find((t) => t.id === id),
    reload,
  };

  return <InventoryTypesContext.Provider value={value}>{children}</InventoryTypesContext.Provider>;
}

export function useInventoryTypes(): InventoryTypesContextValue {
  const ctx = useContext(InventoryTypesContext);
  if (!ctx) throw new Error("useInventoryTypes doit être utilisé à l'intérieur de <InventoryTypesProvider>");
  return ctx;
}
