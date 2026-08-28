import { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryTypes } from "../../state/InventoryTypesContext";
import { createItem, fetchItems, logUsage, receiveStock, setItemArchived, updateItem, type ApiItem } from "../../lib/stockApi";
import { fetchSuppliers, type Supplier } from "../../lib/suppliersApi";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Banner } from "../../components/ui/Banner";
import { AddItemModal } from "./AddItemModal";
import { ReceiveStockModal } from "./ReceiveStockModal";
import { LogUsageModal } from "./LogUsageModal";
import { ItemDetailModal } from "./ItemDetailModal";
import { SupplierOrdersModal } from "./SupplierOrdersModal";

function CriticalityPill({ value }: { value: string }) {
  const tone = value === "Haute" ? "danger" : value === "Moyenne" ? "warn" : value === "Basse" ? "ok" : "neutral";
  return <Pill tone={tone}>{value}</Pill>;
}

/** Compact per-product quality classification: 1er / 2ème / rebut, plus the
 * unaccounted warning that surfaces the reconciliation problem at a glance. */
function QualityCell({ item }: { item: ApiItem }) {
  const q = item.qualityBreakdown;
  if (!q) return null;
  const bits = [`1er ${q["1er"]}`, `2e ${q["2ème"]}`, `rebut ${q.rebut}`];
  return (
    <div className="fifo-cell">
      <span className="quality-bits">
        {bits.map((b) => (
          <span key={b} className="cell-truncate">
            {b}
          </span>
        ))}
      </span>
      {!!item.unaccounted && <Pill tone="danger">{item.unaccounted} inconnues</Pill>}
    </div>
  );
}

type ModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; item: ApiItem }
  | { kind: "receive"; item: ApiItem }
  | { kind: "usage"; item: ApiItem }
  | { kind: "orders" }
  | { kind: "detail"; item: ApiItem };

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
          <Button variant="secondary" onClick={() => setModal({ kind: "orders" })}>
            Commandes fournisseurs
          </Button>
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
                <th>Photo</th>
                <th>Article</th>
                <th>Référence</th>
                {inventoryType.hasColor ? <th>Couleur</th> : null}
                {inventoryType.hasSize ? <th>Taille</th> : null}
                {inventoryType.hasGender ? <th>Sexe</th> : null}
                {inventoryType.hasPrice ? <th>Prix (DZD)</th> : null}
                {inventoryType.hasDescription ? <th>Description</th> : null}
                {inventoryType.hasMachineInfo ? <th>Machine</th> : null}
                {inventoryType.hasMachineInfo ? <th>Fabricant</th> : null}
                {inventoryType.hasMachineInfo ? <th>Localisation</th> : null}
                {inventoryType.hasMachineInfo ? <th>Criticité</th> : null}
                {inventoryType.hasBatches ? <th>{inventoryType.hasExpiry ? "Prochain lot (FEFO)" : "Prochain lot (FIFO)"}</th> : null}
                {inventoryType.hasQuality ? <th>Qualité</th> : null}
                <th>Fournisseur</th>
                <th>Acheté</th>
                <th>Utilisé</th>
                <th>Restant</th>
                <th>Réapp.</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  className="stock-row-clickable"
                  onClick={() => setModal({ kind: "detail", item })}
                  title="Voir les détails"
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    {item.photoUrl ? (
                      <img className="stock-thumb" src={item.photoUrl} alt={item.name} />
                    ) : (
                      <span className="stock-thumb stock-thumb-none" aria-hidden="true">
                        {item.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td>{item.name}</td>
                  <td className="tabular">{item.reference}</td>
                  {inventoryType.hasColor ? (
                    <td>
                      {item.color ? <span className="variant-chip">{item.color}</span> : <span className="field-hint">—</span>}
                    </td>
                  ) : null}
                  {inventoryType.hasSize ? (
                    <td className="tabular">{item.size ? <span className="variant-chip">{item.size}</span> : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasGender ? (
                    <td className="tabular">{item.gender ? <span className="variant-chip">{item.gender}</span> : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasPrice ? (
                    <td className="tabular">{item.price != null ? formatCurrency(item.price) : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasDescription ? (
                    <td title={item.description ?? undefined}>
                      {item.description ? <span className="cell-truncate">{item.description}</span> : <span className="field-hint">—</span>}
                    </td>
                  ) : null}
                  {inventoryType.hasMachineInfo ? (
                    <td>{item.machine ? <span className="cell-truncate">{item.machine}</span> : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasMachineInfo ? (
                    <td>{item.manufacturer ? item.manufacturer : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasMachineInfo ? (
                    <td>{item.location ? <span className="cell-truncate">{item.location}</span> : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasMachineInfo ? (
                    <td>{item.criticality ? <CriticalityPill value={item.criticality} /> : <span className="field-hint">—</span>}</td>
                  ) : null}
                  {inventoryType.hasBatches ? (
                    <td onClick={(e) => e.stopPropagation()}>
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
                  {inventoryType.hasQuality ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <QualityCell item={item} />
                    </td>
                  ) : null}
                  <td>{item.supplier ? item.supplier.name : <span className="field-hint">—</span>}</td>
                  <td className="tabular">{formatQuantity(item.purchased, item.unit)}</td>
                  <td className="tabular">{formatQuantity(item.used, item.unit)}</td>
                  <td className="tabular stock-row-remaining">{formatQuantity(item.quantity, item.unit)}</td>
                  <td className="tabular" title={`Seuil de réapprovisionnement : ${formatQuantity(item.reorderThreshold, item.unit)}`}>
                    {formatQuantity(item.reorderThreshold, item.unit)}
                  </td>
                  <td>
                    {item.archived ? (
                      <Pill tone="neutral">Archivé</Pill>
                    ) : (
                      <span className="fifo-cell">
                        {item.stockStatus === "low" ? (
                          <Pill tone="danger">Faible</Pill>
                        ) : item.stockStatus === "mid" ? (
                          <Pill tone="warn">Moyen</Pill>
                        ) : (
                          <Pill tone="ok">Bien</Pill>
                        )}
                        {item.low ? <Pill tone="danger">Réapprovisionner</Pill> : null}
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <Button variant="secondary" onClick={() => setModal({ kind: "receive", item })} disabled={item.archived}>
                        Réception
                      </Button>
                      <Button variant="secondary" onClick={() => setModal({ kind: "usage", item })} disabled={item.archived || item.quantity <= 0}>
                        Sortie
                      </Button>
                      <Button variant="ghost" onClick={() => setModal({ kind: "detail", item })}>
                        Détails
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
          itemMachine={modal.item.machine ?? ""}
          inventoryType={inventoryType}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await logUsage(modal.item.id, input);
            await loadItems();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "orders" && (
        <SupplierOrdersModal
          suppliers={suppliers}
          items={activeItems}
          onClose={() => setModal({ kind: "none" })}
          onStockChanged={loadItems}
        />
      )}

      {modal.kind === "detail" && <ItemDetailModal item={modal.item} onClose={() => setModal({ kind: "none" })} />}
    </div>
  );
}
