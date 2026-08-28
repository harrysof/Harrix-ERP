import { useEffect, useState } from "react";
import { loadFromStorage, saveToStorage } from "./storage";

/**
 * A list of records persisted to localStorage, for modules that don't have
 * a backend module yet (HR only, now that Orders moved to the API — see
 * PROJECT_CONTEXT.md → "What's backend-wired vs. local-only"). Once a
 * module gets a real API, its page switches to fetch/mutate calls like
 * Stock, Suppliers, Production and Sales did, and this hook goes away for
 * that module. HR is the last remaining user.
 */
export function useLocalCollection<T extends { id: string }>(storageKey: string) {
  const [items, setItems] = useState<T[]>(() => loadFromStorage(storageKey, [] as T[]));

  useEffect(() => {
    saveToStorage(storageKey, items);
  }, [storageKey, items]);

  function add(item: T) {
    setItems((prev) => [...prev, item]);
  }

  function update(id: string, patch: Partial<T>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return { items, add, update, remove, setItems };
}
