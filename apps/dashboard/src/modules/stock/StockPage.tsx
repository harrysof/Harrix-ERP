import { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryTypes } from "../../state/InventoryTypesContext";
import { createItem, fetchItems, logUsage, receiveStock, setItemArchived, updateItem, type ApiItem } from "../../lib/stockApi";
import { fetchSuppliers, type Supplier } from "../../lib/suppliersApi";
import { ApiError } from "../../lib/api";
import { formatDate, formatQuantity } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Banner } from "../../components/ui/Banner";
import { AddItemModal } from "./AddItemModal";
import { ReceiveStockModal } from "./ReceiveStockModal";
import { LogUsageModal } from "./LogUsageModal";
import { ItemHistoryModal } from "./ItemHistoryModal";

type ModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; item: ApiItem }
  | { kind: "receive"; item: ApiItem }
  | { kind: "usage"; item: ApiItem }
  | { kind: "history"; item: ApiItem };

export function StockPage() {
  const { types, loading: typesLoading, error: typesError } = useInventoryTypes();
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  useEffect(() => {
    if (types.length > 0 && !activeTypeId) setActiveTypeId(types[0].id);
  }, [types, activeTypeId]);

  const loadItems = useCallback(() => {
    setItemsLoading(true);
    setLoadError(null);
    return fetchItems(undefined, true)
      .then(setItems)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Impossible de charger le stock."))
      .finally(() => setItemsLoading(false));
  }, []);

  async function toggleArchive(item: ApiItem) {
    await setItemArchived(item.id, !item.archived);
    await loadItems();
  }

  useEffect(() => {
    loadItems();
    fetchSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [loadItems]);

  const inventoryType = types.find((t) => t.id === activeTypeId);

  const activeItems = useMemo(() => items.filter((i) => !i.archived), [items]);

  const lowStockCountByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of activeItems) {
      if (item.low) counts.set(item.inventoryTypeId, (counts.get(item.inventoryTypeId) ?? 0) + 1);
    }
    return counts;
  }, [activeItems]);

  const totalLowStock = useMemo(() => activeItems.filter((i) => i.low).length, [activeItems]);
  const watchBatchCount = useMemo(
    () => activeItems.filter((i) => i.fifoBatch && (i.fifoBatch.status === "expired" || i.fifoBatch.status === "warning")).length,
    [activeItems],
  );

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((i) => i.inventoryTypeId === activeTypeId)
      .filter((i) => showArchived || !i.archived)
      .filter((i) => !query || i.name.toLowerCase().includes(query) || i.reference.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [items, activeTypeId, search, showArchived]);

  if (typesError) return <Banner tone="danger">{typesError}</Banner>;
  if (typesLoading || !inventoryType) return <p className="loading-text">Chargement…</p>;

  return (
    <div className="page-stack">
      {loadError ? <Banner tone="danger">{loadError}</Banner> : null}

      {(totalLowStock > 0 || watchBatchCount > 0) && (
        <Banner tone="warn">
          {totalLowStock > 0 && (
            <span>
              <strong>{totalLowStock}</strong> article{totalLowStock > 1 ? "s" : ""} en stock faible
            </span>
          )}
          {totalLowStock > 0 && watchBatchCount > 0 && <span className="banner-sep">·</span>}
          {watchBatchCount > 0 && (
            <span>
              <strong>{watchBatchCount}</strong> lot{watchBatchCount > 1 ? "s" : ""} de produits chimiques à surveiller
            </span>
          )}
        </Banner>
      )}

      <div className="tab-strip">
        {types.map((type) => {
          const count = lowStockCountByType.get(type.id) ?? 0;
          return (
            <button
              key={type.id}
              type="button"
              className={`tab-strip-item ${activeTypeId === type.id ? "tab-strip-item-active" : ""}`}
              onClick={() => setActiveTypeId(type.id)}
            >
              {type.label}
              {count > 0 ? <span className="tab-strip-badge">{count}</span> : null}
            </button>
          );
        })}
      </div>

      <p className="inventory-description">{inventoryType.description}</p>

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder="Rechercher par nom ou référence…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="toolbar-actions">
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Afficher les archivés
          </label>
          <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
            + Nouvel article
          </Button>
        </div>
      </div>

      {inventoryType.key === "finished-goods" && (
        <Banner tone="info">
          Ce module sera alimenté automatiquement par la Production (onglet Production). En attendant, vous pouvez ajouter des articles à la main.
        </Banner>
      )}

      {itemsLoading ? (
        <p className="loading-text">Chargement du stock…</p>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title={search ? "Aucun article ne correspond à la recherche" : `Aucun ${inventoryType.singular} enregistré`}
          description={!search ? `Ajoutez le premier article de "${inventoryType.label}" pour commencer à suivre le stock.` : undefined}
          action={
            !search ? (
              <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
                + Nouvel article
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Référence</th>
                {inventoryType.hasBatches ? <th>Prochain lot (FIFO)</th> : null}
                <th>Quantité</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="tabular">{item.reference}</td>
                  {inventoryType.hasBatches ? (
                    <td>
                      {item.fifoBatch ? (
                        <span className="fifo-cell">
                          <span>
                            {item.fifoBatch.batchNumber} · {formatQuantity(item.fifoBatch.remaining, item.unit)}
                          </span>
                          {item.fifoBatch.status === "expired" && <Pill tone="danger">Périmé</Pill>}
                          {item.fifoBatch.status === "warning" && <Pill tone="warn">Expire le {formatDate(item.fifoBatch.expiryDate!)}</Pill>}
                          {item.fifoBatch.status === "ok" && <span className="field-hint">exp. {formatDate(item.fifoBatch.expiryDate!)}</span>}
                        </span>
                      ) : (
                        <span className="field-hint">Aucun lot disponible</span>
                      )}
                    </td>
                  ) : null}
                  <td className="tabular">{formatQuantity(item.quantity, item.unit)}</td>
                  <td>
                    {item.archived ? (
                      <Pill tone="neutral">Archivé</Pill>
                    ) : (
                      <Pill tone={item.low ? "warn" : "ok"}>{item.low ? `Faible (seuil ${formatQuantity(item.reorderThreshold, item.unit)})` : "OK"}</Pill>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button variant="secondary" onClick={() => setModal({ kind: "receive", item })} disabled={item.archived}>
                        Réception
                      </Button>
                      <Button variant="secondary" onClick={() => setModal({ kind: "usage", item })} disabled={item.archived || item.quantity <= 0}>
                        Sortie
                      </Button>
                      <Button variant="ghost" onClick={() => setModal({ kind: "history", item })}>
                        Historique
                      </Button>
                      <Button variant="ghost" onClick={() => setModal({ kind: "edit", item })}>
                        Modifier
                      </Button>
                      <Button variant="ghost" onClick={() => toggleArchive(item)}>
                        {item.archived ? "Désarchiver" : "Archiver"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.kind === "add" && (
        <AddItemModal
          inventoryType={inventoryType}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await createItem({ ...input, inventoryTypeId: inventoryType.id });
            await loadItems();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "edit" && (
        <AddItemModal
          inventoryType={inventoryType}
          item={modal.item}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await updateItem(modal.item.id, input);
            await loadItems();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "receive" && (
        <ReceiveStockModal
          itemName={modal.item.name}
          itemUnit={modal.item.unit}
          inventoryType={inventoryType}
          suppliers={suppliers}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await receiveStock(modal.item.id, input);
            await loadItems();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "usage" && (
        <LogUsageModal
          itemId={modal.item.id}
          itemName={modal.item.name}
          itemUnit={modal.item.unit}
          itemQuantity={modal.item.quantity}
          inventoryType={inventoryType}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await logUsage(modal.item.id, input);
            await loadItems();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "history" && (
        <ItemHistoryModal itemId={modal.item.id} itemName={modal.item.name} itemUnit={modal.item.unit} onClose={() => setModal({ kind: "none" })} />
      )}
    </div>
  );
}
