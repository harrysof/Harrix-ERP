import { useCallback, useEffect, useMemo, useState } from "react";
import { PackagePlus, PackageMinus, Eye, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
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
import { inventoryTypeLabel, inventoryTypeSingular, inventoryTypeDescription } from "../../lib/inventoryTypeI18n";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Banner } from "../../components/ui/Banner";
import { Rich } from "../../components/ui/Rich";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";
import { AddItemModal } from "./AddItemModal";
import { ReceiveStockModal } from "./ReceiveStockModal";
import { LogUsageModal } from "./LogUsageModal";
import { ItemDetailModal } from "./ItemDetailModal";
import { SupplierOrdersModal } from "./SupplierOrdersModal";
import { InventoryTypeModal } from "./InventoryTypeModal";

/** Criticality is stored as the French word it was created with; only its label translates. */
const CRITICALITY: Record<string, { tone: "danger" | "warn" | "ok"; key: TranslationKey }> = {
  Haute: { tone: "danger", key: "criticality.high" },
  Moyenne: { tone: "warn", key: "criticality.medium" },
  Basse: { tone: "ok", key: "criticality.low" },
};

function CriticalityPill({ value }: { value: string }) {
  const { t } = useI18n();
  const known = CRITICALITY[value];
  if (!known) return <Pill tone="neutral">{value}</Pill>;
  return <Pill tone={known.tone}>{t(known.key)}</Pill>;
}

/** Compact per-product quality classification: 1er / 2ème / rebut, plus the
 * unaccounted warning that surfaces the reconciliation problem at a glance. */
function QualityCell({ item }: { item: ApiItem }) {
  const { t, tn } = useI18n();
  const q = item.qualityBreakdown;
  if (!q) return null;
  const bits = [
    t("quality.firstShort", { count: q["1er"] }),
    t("quality.secondShortCount", { count: q["2ème"] }),
    t("quality.rejectShortCount", { count: q.rebut }),
  ];
  return (
    <div className="fifo-cell">
      <span className="quality-bits">
        {bits.map((b) => (
          <span key={b} className="cell-truncate">
            {b}
          </span>
        ))}
      </span>
      {!!item.unaccounted && <Pill tone="danger">{tn("stock.unknownUnits", item.unaccounted)}</Pill>}
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
  const { t } = useI18n();
  if (item.averageUnitCost === null) {
    return <span className="field-hint">—</span>;
  }
  return (
    <span className="value-cell">
      <span className="tabular">{formatCurrency(item.stockValue ?? 0)}</span>
      {item.uncostedQuantity > 0 ? (
        <span
          className="field-hint"
          title={t("stock.partialTitle", { quantity: formatQuantity(item.uncostedQuantity, item.unit) })}
        >
          {t("stock.partial")}
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
  const { t, tn, lang } = useI18n();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadItems = useCallback(() => {
    setItemsLoading(true);
    setLoadError(null);
    return fetchItems(undefined, true)
      .then(setItems)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : t("stock.loadFailed")))
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
    if (!window.confirm(t("stock.confirmDeleteItem", { name: item.name }))) return;
    setLoadError(null);
    try {
      await deleteItem(item.id);
      await loadItems();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : t("error.delete"));
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
    if (!window.confirm(t("stock.confirmDeleteType", { label: inventoryTypeLabel(type, lang) }))) return;
    setLoadError(null);
    try {
      await deleteInventoryType(type.id);
      setActiveTypeId(null);
      await reloadTypes();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : t("error.delete"));
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
  if (typesLoading || !inventoryType) return <p className="loading-text">{t("state.loading")}</p>;

  // Finished goods are not bought, they are made: their "cost" is what the
  // production batches that made them consumed in raw materials, and calling
  // it anything less qualified would overstate what the figure knows.
  const isFinishedGoods = inventoryType.key === "finished-goods";
  const costColumnLabel = t(isFinishedGoods ? "stock.materialCost" : "stock.col.unitCostShort");
  const costColumnHint = t(isFinishedGoods ? "stock.producedCostHint" : "stock.weightedAverage");

  return (
    <div className="page-stack">
      {loadError ? <Banner tone="danger">{loadError}</Banner> : null}

      {(totalLowStock > 0 || watchBatchCount > 0) && (
        <Banner tone="warn">
          {totalLowStock > 0 && <span>{tn("stock.lowStock", totalLowStock)}</span>}
          {totalLowStock > 0 && watchBatchCount > 0 && <span className="banner-sep">·</span>}
          {watchBatchCount > 0 && <span>{tn("stock.watchBatch", watchBatchCount)}</span>}
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
              {inventoryTypeLabel(type, lang)}
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
          title={t("stock.newInventoryTitle")}
        >
          {t("stock.newInventory")}
        </button>
      </div>

      <div className="inventory-heading">
        <p className="inventory-description">{inventoryTypeDescription(inventoryType, lang)}</p>
        <div className="row-actions">
          <Button variant="ghost" onClick={() => setModal({ kind: "edit-type", type: inventoryType })}>
            {t("stock.configureInventory")}
          </Button>
          <Button variant="ghost" onClick={() => removeType(inventoryType)}>
            {t("stock.deleteInventory")}
          </Button>
        </div>
      </div>

      <div className="detail-stats">
        <div className="stat-card">
          <span className="stat-card-label">{t("stock.inventoryValue")}</span>
          <span className="stat-card-value">{formatCurrency(typeStockValue)}</span>
          <span className="stat-card-hint">
            {unpricedCount > 0 ? tn("stock.unpricedItems", unpricedCount) : t("stock.weightedAverageShort")}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">{t("stock.totalValue")}</span>
          <span className="stat-card-value">{formatCurrency(totalStockValue)}</span>
          <span className="stat-card-hint">{t("stock.allInventories")}</span>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder={t("stock.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="toolbar-actions">
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            {t("action.showArchived")}
          </label>
          <Button variant="secondary" onClick={() => setModal({ kind: "orders" })}>
            {t("stock.supplierOrders")}
          </Button>
          <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
            {t("stock.newItem")}
          </Button>
        </div>
      </div>

      {inventoryType.key === "finished-goods" && (
        <>
          <Banner tone="info">
            {t("stock.productionFed")}
          </Banner>
          <Banner tone="warn">
            <Rich
              text={t("stock.finishedGoodsWarning")}
              parts={{ lead: <strong>{t("stock.materialCostLead")}</strong> }}
            />
          </Banner>
        </>
      )}

      {itemsLoading ? (
        <p className="loading-text">{t("stock.loading")}</p>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title={search ? t("stock.noMatch") : t("stock.emptyTitle", { singular: inventoryTypeSingular(inventoryType, lang) })}
          description={!search ? t("stock.emptyDesc", { label: inventoryTypeLabel(inventoryType, lang) }) : undefined}
          action={
            !search ? (
              <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
                {t("stock.newItem")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>{t("field.photo")}</th>
                <th>{t("stock.col.item")}</th>
                <th>{t("field.reference")}</th>
                {inventoryType.hasColor ? <th>{t("stock.col.color")}</th> : null}
                {inventoryType.hasSize ? <th>{t("stock.col.size")}</th> : null}
                {inventoryType.hasGender ? <th>{t("stock.col.gender")}</th> : null}
                {inventoryType.hasPrice ? <th>{t("stock.col.salePriceShort")}</th> : null}
                {inventoryType.hasDescription ? <th>{t("field.description")}</th> : null}
                {inventoryType.hasMachineInfo ? <th>{t("field.machine")}</th> : null}
                {inventoryType.hasMachineInfo ? <th>{t("stock.col.manufacturer")}</th> : null}
                {inventoryType.hasMachineInfo ? <th>{t("stock.col.location")}</th> : null}
                {inventoryType.hasMachineInfo ? <th>{t("stock.col.criticality")}</th> : null}
                {inventoryType.hasBatches ? (
                  <th>{t(inventoryType.hasExpiry ? "stock.lot.nextFefo" : "stock.lot.nextFifo")}</th>
                ) : null}
                {inventoryType.hasQuality ? <th>{t("stock.col.quality")}</th> : null}
                <th>{t("field.supplier")}</th>
                <th>{t("stock.col.purchased")}</th>
                <th>{t("stock.col.used")}</th>
                <th>{t("stock.col.remaining")}</th>
                <th title={costColumnHint}>{costColumnLabel}</th>
                <th title={t("stock.remainingTimesCost")}>{t("stock.col.stockValue")}</th>
                <th>{t("stock.col.reorderShort")}</th>
                <th>{t("field.status")}</th>
                <th aria-label={t("field.actions")} />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr
                  key={item.id}
                  className="stock-row-clickable"
                  onClick={() => setModal({ kind: "detail", item })}
                  title={t("stock.viewDetails")}
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
                          {item.fifoBatch.status === "expired" && <Pill tone="danger">{t("stock.lot.expired")}</Pill>}
                          {item.fifoBatch.status === "warning" && (
                            <Pill tone="warn">
                              {t("stock.lot.expiresOn", { date: formatDate(item.fifoBatch.expiryDate!) })}
                            </Pill>
                          )}
                          {item.fifoBatch.status === "ok" && (
                            <span className="field-hint">
                              {t("stock.lot.expiryShort", { date: formatDate(item.fifoBatch.expiryDate!) })}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="field-hint">{t("stock.lot.none")}</span>
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
                  <td className="tabular" title={item.averageUnitCost !== null ? costColumnHint : t("stock.noValuedEntry")}>
                    {item.averageUnitCost !== null ? formatCurrency(item.averageUnitCost) : <span className="field-hint">—</span>}
                  </td>
                  <td className="tabular">
                    <ValueCell item={item} />
                  </td>
                  <td className="tabular" title={t("stock.reorderTitle", { quantity: formatQuantity(item.reorderThreshold, item.unit) })}>
                    {formatQuantity(item.reorderThreshold, item.unit)}
                  </td>
                  <td>
                    {item.archived ? (
                      <Pill tone="neutral">{t("state.archived")}</Pill>
                    ) : (
                      <span className="fifo-cell">
                        {item.stockStatus === "low" ? (
                          <Pill tone="danger">{t("stock.state.low")}</Pill>
                        ) : item.stockStatus === "mid" ? (
                          <Pill tone="warn">{t("stock.state.mid")}</Pill>
                        ) : (
                          <Pill tone="ok">{t("stock.state.good")}</Pill>
                        )}
                        {item.low ? <Pill tone="danger">{t("stock.reorderAction")}</Pill> : null}
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title={t("stock.receive")}
                        disabled={item.archived}
                        onClick={() => setModal({ kind: "receive", item })}
                      >
                        <PackagePlus size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title={t("stock.issue")}
                        disabled={item.archived || item.quantity <= 0}
                        onClick={() => setModal({ kind: "usage", item })}
                      >
                        <PackageMinus size={16} strokeWidth={2} />
                      </button>
                      <button type="button" className="icon-button" title={t("action.details")} onClick={() => setModal({ kind: "detail", item })}>
                        <Eye size={16} strokeWidth={2} />
                      </button>
                      <button type="button" className="icon-button" title={t("action.edit")} onClick={() => setModal({ kind: "edit", item })}>
                        <Pencil size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title={t(item.archived ? "action.unarchive" : "action.archive")}
                        onClick={() => toggleArchive(item)}
                      >
                        {item.archived ? <ArchiveRestore size={16} strokeWidth={2} /> : <Archive size={16} strokeWidth={2} />}
                      </button>
                      {item.deletable ? (
                        <button type="button" className="icon-button" title={t("action.delete")} onClick={() => removeItem(item)}>
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
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
                  t("stock.createdButStockFailed", {
                    name: created.name,
                    reason: e instanceof ApiError ? e.message : t("stock.unknownError"),
                  }),
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
