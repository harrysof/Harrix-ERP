import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { InventoryTypeConfig } from "../lib/types";
import { fetchInventoryTypes } from "../lib/stockApi";
import { ApiError } from "../lib/api";

interface InventoryTypesContextValue {
  types: InventoryTypeConfig[];
  loading: boolean;
  error: string | null;
  getType: (id: string) => InventoryTypeConfig | undefined;
}

const InventoryTypesContext = createContext<InventoryTypesContextValue | null>(null);

export function InventoryTypesProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState<InventoryTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventoryTypes()
      .then((data) => setTypes([...data].sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les types d'inventaire."))
      .finally(() => setLoading(false));
  }, []);

  const value: InventoryTypesContextValue = {
    types,
    loading,
    error,
    getType: (id) => types.find((t) => t.id === id),
  };

  return <InventoryTypesContext.Provider value={value}>{children}</InventoryTypesContext.Provider>;
}

export function useInventoryTypes(): InventoryTypesContextValue {
  const ctx = useContext(InventoryTypesContext);
  if (!ctx) throw new Error("useInventoryTypes doit être utilisé à l'intérieur de <InventoryTypesProvider>");
  return ctx;
}
