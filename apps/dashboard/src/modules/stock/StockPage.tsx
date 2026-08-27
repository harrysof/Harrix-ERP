import { useMemo, useState } from "react";
import { useStock } from "../../state/StockContext";
import { INVENTORY_TYPES } from "../../lib/stockConfig";
import type { InventoryTypeId, Item } from "../../lib/types";
import {
  getBatchesWithRemaining,
  getExpiryStatus,
  getFifoBatch,
  getItemQuantity,
  isLowStock,
  todayIso,
} from "../../lib/stockEngine";
import { formatDate, formatQuantity } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { AddItemModal } from "./AddItemModal";
import { ReceiveStockModal } from "./ReceiveStockModal";
import { LogUsageModal } from "./LogUsageModal";
import { ItemHistoryModal } from "./ItemHistoryModal";

type ModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "receive"; item: Item }
  | { kind: "usage"; item: Item }
  | { kind: "history"; item: Item };

export function StockPage() {
  const { items, batches, movements, addItem, receiveStock, logUsage, resetDemoData } = useStock();
  const [activeType, setActiveType] = useState<InventoryTypeId>(INVENTORY_TYPES[0].id);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const today = todayIso();

  const inventoryType = INVENTORY_TYPES.find((t) => t.id === activeType)!;

  const lowStockCountByType = useMemo(() => {
    const counts = new Map<InventoryTypeId, number>();
    for (const item of items) {
      const quantity = getItemQuantity(movements, item.id);
      if (isLowStock(quantity, item.reorderThreshold)) {
        counts.set(item.inventoryTypeId, (counts.get(item.inventoryTypeId) ?? 0) + 1);
      }
    }
    return counts;
  }, [items, movements]);

  const watchBatchCount = useMemo(
    () => batches.filter((b) => ["expired", "warning"].includes(getExpiryStatus(b.expiryDate, today))).length,
    [batches, today],
  );

  const totalLowStock = useMemo(() => [...lowStockCountByType.values()].reduce((a, b) => a + b, 0), [lowStockCountByType]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((i) => i.inventoryTypeId === activeType)
      .filter((i) => !query || i.name.toLowerCase().includes(query) || i.reference.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [items, activeType, search]);

  return (
    <div className="page-stack">
      {(totalLowStock > 0 || watchBatchCount > 0) && (
        <div className="banner banner-warn">
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
        </div>
      )}

      <div className="tab-strip">
        {INVENTORY_TYPES.map((type) => {
          const count = lowStockCountByType.get(type.id) ?? 0;
          return (
            <button
              key={type.id}
              type="button"
              className={`tab-strip-item ${activeType === type.id ? "tab-strip-item-active" : ""}`}
              onClick={() => setActiveType(type.id)}
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
          <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
            + Nouvel article
          </Button>
          <Button variant="ghost" onClick={() => confirm("Réinitialiser toutes les données de démonstration ?") && resetDemoData()}>
            Réinitialiser la démo
          </Button>
        </div>
      </div>

      {inventoryType.id === "finished-goods" && (
        <div className="banner banner-info">
          Ce module sera alimenté automatiquement par la Production (phase à venir). En attendant, vous pouvez ajouter des articles à la main.
        </div>
      )}

      {visibleItems.length === 0 ? (
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
            {visibleItems.map((item) => {
              const quantity = getItemQuantity(movements, item.id);
              const low = isLowStock(quantity, item.reorderThreshold);
              const fifo = inventoryType.hasBatches ? getFifoBatch(getBatchesWithRemaining(batches, movements, item.id, today)) : null;

              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="tabular">{item.reference}</td>
                  {inventoryType.hasBatches ? (
                    <td>
                      {fifo ? (
                        <span className="fifo-cell">
                          <span>
                            {fifo.batchNumber} · {formatQuantity(fifo.remaining, item.unit)}
                          </span>
                          {fifo.status === "expired" && <Pill tone="danger">Périmé</Pill>}
                          {fifo.status === "warning" && <Pill tone="warn">Expire le {formatDate(fifo.expiryDate!)}</Pill>}
                          {fifo.status === "ok" && <span className="field-hint">exp. {formatDate(fifo.expiryDate!)}</span>}
                        </span>
                      ) : (
                        <span className="field-hint">Aucun lot disponible</span>
                      )}
                    </td>
                  ) : null}
                  <td className="tabular">{formatQuantity(quantity, item.unit)}</td>
                  <td>
                    <Pill tone={low ? "warn" : "ok"}>{low ? `Faible (seuil ${formatQuantity(item.reorderThreshold, item.unit)})` : "OK"}</Pill>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button variant="secondary" onClick={() => setModal({ kind: "receive", item })}>
                        Réception
                      </Button>
                      <Button variant="secondary" onClick={() => setModal({ kind: "usage", item })} disabled={quantity <= 0}>
                        Sortie
                      </Button>
                      <Button variant="ghost" onClick={() => setModal({ kind: "history", item })}>
                        Historique
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {modal.kind === "add" && (
        <AddItemModal
          inventoryType={inventoryType}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            addItem({ ...input, inventoryTypeId: activeType });
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "receive" && (
        <ReceiveStockModal
          item={modal.item}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            receiveStock({ itemId: modal.item.id, ...input });
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "usage" && (
        <LogUsageModal
          item={modal.item}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            logUsage({ itemId: modal.item.id, ...input });
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "history" && <ItemHistoryModal item={modal.item} onClose={() => setModal({ kind: "none" })} />}
    </div>
  );
}
