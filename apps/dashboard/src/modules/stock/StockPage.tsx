import { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryTypes } from "../../state/InventoryTypesContext";
import {
  createInventoryType,
  createItem,
  deleteInventoryType,
  deleteItem,
  fetchItems,
  logUsage,
  receiveStock,
  setItemArchived,
  updateInventoryType,
  updateItem,
  type ApiItem,
} from "../../lib/stockApi";
import { fetchSuppliers, type Supplier } from "../../lib/suppliersApi";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import type { InventoryTypeConfig } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Banner } from "../../components/ui/Banner";
import { AddItemModal } from "./AddItemModal";
import { ReceiveStockModal } from "./ReceiveStockModal";
import { LogUsageModal } from "./LogUsageModal";
import { ItemDetailModal } from "./ItemDetailModal";
import { SupplierOrdersModal } from "./SupplierOrdersModal";
import { InventoryTypeModal } from "./InventoryTypeModal";

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

/**
 * The cost of one unit, and what the stock on hand is therefore worth.
 *
 * Both figures come from the backend, which derives them from the movement
 * ledger — the money mirror of the rule that quantity is never stored. A dash
 * means nothing has ever been priced, which is a different statement from
 * "worth nothing" and is shown as such.
 */
function ValueCell({ item }: { item: ApiItem }) {
  if (item.averageUnitCost === null) {
    return <span className="field-hint">—</span>;
  }
  return (
    <span className="value-cell">
      <span className="tabular">{formatCurrency(item.stockValue ?? 0)}</span>
      {item.uncostedQuantity > 0 ? (
        <span className="field-hint" title={`${formatQuantity(item.uncostedQuantity, item.unit)} sont entrés sans prix connu — la valeur ci-dessus ne les compte pas.`}>
          partiel
        </span>
      ) : null}
    </span>
  );
}

type ModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "add-type" }
  | { kind: "edit-type"; type: InventoryTypeConfig }
  | { kind: "edit"; item: ApiItem }
  | { kind: "receive"; item: ApiItem }
  | { kind: "usage"; item: ApiItem }
  | { kind: "orders" }
  | { kind: "detail"; item: ApiItem };

export function StockPage() {
  const { types, loading: typesLoading, error: typesError, reload: reloadTypes } = useInventoryTypes();
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

  /**
   * Only offered for items the backend says are deletable (no movements, no
   * production references). Everything with history is archived instead — see
   * PROJECT_CONTEXT.md §4.
   */
  async function removeItem(item: ApiItem) {
    if (!window.confirm(`Supprimer définitivement « ${item.name} » ? Cet article n'a aucun historique, la suppression est donc sans effet sur le stock.`)) {
      return;
    }
    setLoadError(null);
    try {
      await deleteItem(item.id);
      await loadItems();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  useEffect(() => {
    loadItems();
    fetchSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [loadItems]);

  /**
   * Removes an inventory tab. The backend refuses as long as it holds any
   * article — deleting the type would leave its articles, lots and movements
   * pointing at nothing — so this only ever succeeds on an empty one.
   */
  async function removeType(type: InventoryTypeConfig) {
    if (!window.confirm(`Supprimer l'inventaire « ${type.label} » ? Cette action n'est possible que s'il ne contient aucun article.`)) {
      return;
    }
    setLoadError(null);
    try {
      await deleteInventoryType(type.id);
      setActiveTypeId(null);
      await reloadTypes();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

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

  /** What the currently displayed inventory is worth, and what the whole store is. */
  const typeStockValue = useMemo(
    () => activeItems.filter((i) => i.inventoryTypeId === activeTypeId).reduce((sum, i) => sum + (i.stockValue ?? 0), 0),
    [activeItems, activeTypeId],
  );
  const totalStockValue = useMemo(() => activeItems.reduce((sum, i) => sum + (i.stockValue ?? 0), 0), [activeItems]);
  const unpricedCount = useMemo(
    () => activeItems.filter((i) => i.inventoryTypeId === activeTypeId && i.averageUnitCost === null && i.quantity > 0).length,
    [activeItems, activeTypeId],
  );
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

  // Finished goods are not bought, they are made: their "cost" is what the
  // production batches that made them consumed in raw materials, and calling
  // it anything less qualified would overstate what the figure knows.
  const isFinishedGoods = inventoryType.key === "finished-goods";
  const costColumnLabel = isFinishedGoods ? "Coût matières" : "Coût unit.";
  const costColumnHint = isFinishedGoods
    ? "Coût matières premières par unité, moyenne des lots de production qui l'ont fabriqué. Hors main-d'œuvre, énergie et frais généraux."
    : "Coût moyen pondéré d'une unité, calculé sur ce qui est réellement entré en stock";

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
        {/* Inventories are rows, not an enum (backend schema.prisma) — a fifth
            one is added here, not in a migration. */}
        <button
          type="button"
          className="tab-strip-item tab-strip-add"
          onClick={() => setModal({ kind: "add-type" })}
          title="Ajouter un inventaire (un nouvel onglet de stock)"
        >
          + Inventaire
        </button>
      </div>

      <div className="inventory-heading">
        <p className="inventory-description">{inventoryType.description}</p>
        <div className="row-actions">
          <Button variant="ghost" onClick={() => setModal({ kind: "edit-type", type: inventoryType })}>
            Configurer cet inventaire
          </Button>
          <Button variant="ghost" onClick={() => removeType(inventoryType)}>
            Supprimer l'inventaire
          </Button>
        </div>
      </div>

      <div className="detail-stats">
        <div className="stat-card">
          <span className="stat-card-label">Valeur de cet inventaire</span>
          <span className="stat-card-value">{formatCurrency(typeStockValue)}</span>
          <span className="stat-card-hint">
            {unpricedCount > 0
              ? `${unpricedCount} article${unpricedCount > 1 ? "s" : ""} en stock sans coût connu — non compté${unpricedCount > 1 ? "s" : ""} ici`
              : "Coût moyen pondéré de ce qui est réellement entré"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Valeur totale du stock</span>
          <span className="stat-card-value">{formatCurrency(totalStockValue)}</span>
          <span className="stat-card-hint">Tous inventaires confondus</span>
        </div>
      </div>

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
        <>
          <Banner tone="info">
            Ce module sera alimenté automatiquement par la Production (onglet Production). En attendant, vous pouvez ajouter des articles à la main.
          </Banner>
          <Banner tone="warn">
            Le coût affiché ici est un <strong>coût matières estimé</strong> : il ne comprend que les matières premières consommées par les
            lots de production qui ont fabriqué ces articles. Main-d'œuvre, énergie, amortissement des machines et frais généraux n'y sont
            pas — le coût de revient réel est plus élevé.
          </Banner>
        </>
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
                {inventoryType.hasPrice ? <th>Prix vente</th> : null}
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
                <th title={costColumnHint}>{costColumnLabel}</th>
                <th title="Quantité restante × coût unitaire moyen">Valeur stock</th>
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
                  <td className="tabular" title={item.averageUnitCost !== null ? costColumnHint : "Aucune entrée valorisée pour cet article"}>
                    {item.averageUnitCost !== null ? formatCurrency(item.averageUnitCost) : <span className="field-hint">—</span>}
                  </td>
                  <td className="tabular">
                    <ValueCell item={item} />
                  </td>
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
                      {item.deletable ? (
                        <Button variant="danger" onClick={() => removeItem(item)}>
                          Supprimer
                        </Button>
                      ) : null}
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
          onSubmit={async ({ initialStock, ...input }) => {
            const created = await createItem({ ...input, inventoryTypeId: inventoryType.id });
            // Opening stock is a reception, not a column — so it is a second
            // call, and a failing one must say what already exists rather
            // than pretend nothing happened (PROJECT_CONTEXT.md §8.3).
            if (initialStock) {
              try {
                await receiveStock(created.id, {
                  ...initialStock,
                  supplierId: null,
                  unitCost: input.unitCost ?? null,
                });
              } catch (e) {
                await loadItems();
                setModal({ kind: "none" });
                setLoadError(
                  `« ${created.name} » a bien été créé, mais sa quantité initiale n'a pas pu être enregistrée : ${
                    e instanceof ApiError ? e.message : "erreur inconnue"
                  } Utilisez le bouton « Réception » sur sa ligne.`,
                );
                return;
              }
            }
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
          onSubmit={async ({ initialStock: _initialStock, ...input }) => {
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
          itemUnitCost={modal.item.unitCost ?? modal.item.averageUnitCost}
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

      {modal.kind === "add-type" && (
        <InventoryTypeModal
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            const created = await createInventoryType(input);
            await reloadTypes();
            setActiveTypeId(created.id);
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "edit-type" && (
        <InventoryTypeModal
          type={modal.type}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async ({ key: _key, ...input }) => {
            await updateInventoryType(modal.type.id, input);
            await reloadTypes();
            await loadItems();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "detail" && <ItemDetailModal item={modal.item} onClose={() => setModal({ kind: "none" })} />}
    </div>
  );
}
