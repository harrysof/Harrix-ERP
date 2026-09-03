import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Truck, Wallet, Receipt as ReceiptIcon, CircleAlert } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import { createSupplier, fetchSuppliers, setSupplierArchived, updateSupplier, type Supplier } from "../../lib/suppliersApi";
import {
  fetchPurchaseOrders,
  PO_PAYMENT_LABELS,
  PO_PAYMENT_STATUSES,
  PO_PAYMENT_TONES,
  PO_STATUS_LABELS,
  PO_STATUS_ORDER,
  PO_STATUS_TONES,
  type ApiPurchaseOrder,
  type PoFilters,
} from "../../lib/purchasingApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import { PurchaseOrderModal } from "./PurchaseOrderModal";
import { PurchaseOrderDetailModal } from "./PurchaseOrderDetailModal";
import { SupplierModal } from "../suppliers/SupplierModal";
import { SupplierDetailModal } from "../suppliers/SupplierDetailModal";

type Tab = "orders" | "suppliers";
type SupplierModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; supplier: Supplier }
  | { kind: "detail"; supplier: Supplier };

/**
 * §13/§14: achats et fournisseurs — Supplier → Purchase Order → Delivery →
 * Inventory is one flow, so it lives in one tab (mirrors Ventes & clients).
 * The "Reçu" column makes the middle step visible: an approved order that
 * hasn't arrived is a commitment, not stock.
 */
export function PurchasingPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [filters, setFilters] = useState<PoFilters>({});
  const [showArchivedSuppliers, setShowArchivedSuppliers] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierModal, setSupplierModal] = useState<SupplierModalState>({ kind: "none" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchPurchaseOrders(filters), fetchSuppliers(true), fetchItems()])
      .then(([nextOrders, nextSuppliers, nextItems]) => {
        setOrders(nextOrders);
        setSuppliers(nextSuppliers);
        setItems(nextItems);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("po.loadFailed")))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<PoFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);
  const openOrder = orders.find((o) => o.id === openId) ?? null;
  const editingOrder = orders.find((o) => o.id === editingId) ?? null;

  // Materials only — you don't buy your own finished goods.
  const purchasableItems = items.filter((i) => i.inventoryType.key !== "finished-goods");

  const activeSuppliers = suppliers.filter((s) => !s.archived);
  const visibleSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();
    return (showArchivedSuppliers ? suppliers : activeSuppliers)
      .filter((s) => !query || s.name.toLowerCase().includes(query) || (s.contactName ?? "").toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [suppliers, activeSuppliers, showArchivedSuppliers, supplierSearch]);

  const open = orders.filter((o) => o.status !== "RECEIVED" && o.status !== "CANCELLED");
  const committed = open.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.outstanding * l.unitCost, 0), 0);
  const owed = orders
    .filter((o) => o.status !== "CANCELLED" && o.paymentStatus !== "CANCELLED")
    .filter((o) => o.paymentStatus === "PENDING" || o.paymentStatus === "PARTIAL")
    .reduce((sum, o) => sum + o.balanceDue, 0);

  async function toggleSupplierArchive(supplier: Supplier) {
    await setSupplierArchived(supplier.id, !supplier.archived);
    await load();
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="stat-grid">
        <StatCard icon={ClipboardList} label={t("po.tabOrders")} value={orders.length} hint={t("po.kpi.orderedHint")} />
        <StatCard
          icon={Truck}
          label={t("po.kpi.inProgress")}
          value={open.length}
          hint={t("po.kpi.inProgressHint")}
          tone={open.length > 0 ? "warn" : "neutral"}
        />
        <StatCard icon={Wallet} label={t("po.commitments")} value={formatCurrency(committed)} hint={t("po.kpi.ordered")} />
        <StatCard
          icon={ReceiptIcon}
          label={t("po.kpi.total")}
          value={formatCurrency(orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.totals.total, 0))}
          hint={t("po.kpi.totalHint")}
        />
        <StatCard
          icon={CircleAlert}
          label={t("po.kpi.due")}
          value={formatCurrency(owed)}
          hint={t("po.kpi.dueHint")}
          tone={owed > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="toolbar">
        <div className="tab-strip">
          <button type="button" className={`tab-strip-item ${tab === "orders" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("orders")}>
            {t("po.tabPurchases")}
            {orders.length > 0 ? <span className="tab-strip-badge">{orders.length}</span> : null}
          </button>
          <button
            type="button"
            className={`tab-strip-item ${tab === "suppliers" ? "tab-strip-item-active" : ""}`}
            onClick={() => setTab("suppliers")}
          >
            {t("po.tabSuppliers")}
            {activeSuppliers.length > 0 ? <span className="tab-strip-badge">{activeSuppliers.length}</span> : null}
          </button>
        </div>
        <div className="toolbar-actions">
          {tab === "orders"
            ? can("purchasing:write") && (
                <Button variant="primary" onClick={() => setCreating(true)} disabled={activeSuppliers.length === 0}>
                  {t("po.new")}
                </Button>
              )
            : (
                <Button variant="primary" onClick={() => setSupplierModal({ kind: "add" })}>
                  {t("po.newSupplier")}
                </Button>
              )}
        </div>
      </div>

      {tab === "orders" && activeSuppliers.length === 0 && !loading ? (
        <Banner tone="info">{t("po.supplierFirst")}</Banner>
      ) : null}

      {tab === "orders" ? (
        <>
          <div className="filter-bar">
            <Field label={t("field.supplier")}>
              <select className="input" value={filters.supplierId ?? ""} onChange={(e) => set({ supplierId: e.target.value })}>
                <option value="">{t("state.all")}</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("field.status")}>
              <select className="input" value={filters.status ?? ""} onChange={(e) => set({ status: e.target.value })}>
                <option value="">{t("state.all")}</option>
                {PO_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {t(PO_STATUS_LABELS[s])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("field.payment")}>
              <select className="input" value={filters.paymentStatus ?? ""} onChange={(e) => set({ paymentStatus: e.target.value })}>
                <option value="">{t("state.all")}</option>
                {PO_PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(PO_PAYMENT_LABELS[s])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("field.from")}>
              <input className="input" type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
            </Field>
            <Field label={t("field.to")}>
              <input className="input" type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
            </Field>
            {hasFilters ? (
              <Button variant="ghost" onClick={() => setFilters({})}>
                {t("action.reset")}
              </Button>
            ) : null}
          </div>

          {loading ? (
            <p className="loading-text">{t("po.loadingOrders")}</p>
          ) : orders.length === 0 ? (
            <EmptyState
              title={hasFilters ? t("po.noMatch") : t("po.none")}
              description={hasFilters ? t("po.widenPeriod") : t("po.createFirst")}
            />
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>{t("field.number")}</th>
                    <th>{t("field.date")}</th>
                    <th>{t("field.supplier")}</th>
                    <th>{t("po.col.expected")}</th>
                    <th className="num">{t("po.col.lines")}</th>
                    <th className="num">{t("po.col.receivedQty")}</th>
                    <th className="num">{t("field.total")}</th>
                    <th>{t("field.status")}</th>
                    <th>{t("field.payment")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const ordered = order.lines.reduce((s, l) => s + l.quantity, 0);
                    const received = order.lines.reduce((s, l) => s + l.received, 0);
                    const late =
                      order.expectedDate &&
                      order.status !== "RECEIVED" &&
                      order.status !== "CANCELLED" &&
                      new Date(order.expectedDate) < new Date();
                    return (
                      <tr key={order.id} className={late ? "row-attention" : undefined}>
                        <td>
                          <button type="button" className="link-button" onClick={() => setOpenId(order.id)}>
                            {order.code}
                          </button>
                        </td>
                        <td className="tabular">{formatDate(order.date)}</td>
                        <td>{order.supplier.name}</td>
                        <td className="tabular">
                          {order.expectedDate ? formatDate(order.expectedDate) : <span className="muted">—</span>}
                          {late ? <span className="muted">{t("po.lateSuffix")}</span> : null}
                        </td>
                        <td className="tabular num">{order.lines.length}</td>
                        <td className="tabular num">
                          {received} / {ordered}
                        </td>
                        <td className="tabular num">{formatCurrency(order.totals.total)}</td>
                        <td>
                          <Pill tone={PO_STATUS_TONES[order.status]}>{t(PO_STATUS_LABELS[order.status])}</Pill>
                        </td>
                        <td>
                          <Pill tone={PO_PAYMENT_TONES[order.paymentStatus]}>{t(PO_PAYMENT_LABELS[order.paymentStatus])}</Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="toolbar">
            <input
              className="input toolbar-search"
              placeholder={t("po.searchSupplier")}
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
            />
            <label className="checkbox-row">
              <input type="checkbox" checked={showArchivedSuppliers} onChange={(e) => setShowArchivedSuppliers(e.target.checked)} />
              <span>{t("action.showArchived")}</span>
            </label>
          </div>

          {loading ? (
            <p className="loading-text">{t("po.loadingSuppliers")}</p>
          ) : visibleSuppliers.length === 0 ? (
            <EmptyState
              title={supplierSearch ? t("po.noSupplierMatch") : t("po.noSuppliers")}
              description={!supplierSearch ? t("po.addSuppliersDesc") : undefined}
              action={
                !supplierSearch ? (
                  <Button variant="primary" onClick={() => setSupplierModal({ kind: "add" })}>
                    {t("po.newSupplier")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>{t("field.name")}</th>
                    <th>{t("po.col.contact")}</th>
                    <th>{t("field.phone")}</th>
                    <th>{t("field.status")}</th>
                    <th aria-label={t("field.actions")} />
                  </tr>
                </thead>
                <tbody>
                  {visibleSuppliers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {can("purchasing:read") ? (
                          <button type="button" className="link-button" onClick={() => setSupplierModal({ kind: "detail", supplier: s })}>
                            {s.name}
                          </button>
                        ) : (
                          s.name
                        )}
                      </td>
                      <td>{s.contactName ?? "—"}</td>
                      <td className="tabular">{s.phone ?? "—"}</td>
                      <td>
                        <Pill tone={s.archived ? "neutral" : "ok"}>{t(s.archived ? "state.archived" : "state.active")}</Pill>
                      </td>
                      <td>
                        <div className="row-actions">
                          {can("purchasing:read") ? (
                            <Button variant="ghost" onClick={() => setSupplierModal({ kind: "detail", supplier: s })}>
                              {t("sales.file")}
                            </Button>
                          ) : null}
                          <Button variant="secondary" onClick={() => setSupplierModal({ kind: "edit", supplier: s })}>
                            {t("action.edit")}
                          </Button>
                          <Button variant="ghost" onClick={() => toggleSupplierArchive(s)}>
                            {t(s.archived ? "action.unarchive" : "action.archive")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {creating || editingOrder ? (
        <PurchaseOrderModal
          suppliers={activeSuppliers}
          items={purchasableItems}
          order={editingOrder ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditingId(null);
            load();
          }}
        />
      ) : null}

      {openOrder ? (
        <PurchaseOrderDetailModal
          order={openOrder}
          onClose={() => setOpenId(null)}
          onChanged={load}
          onEdit={() => {
            setEditingId(openOrder.id);
            setOpenId(null);
          }}
        />
      ) : null}

      {supplierModal.kind === "add" && (
        <SupplierModal
          supplier={null}
          onClose={() => setSupplierModal({ kind: "none" })}
          onSubmit={async (input) => {
            await createSupplier(input);
            await load();
            setSupplierModal({ kind: "none" });
          }}
        />
      )}

      {supplierModal.kind === "detail" && (
        <SupplierDetailModal supplier={supplierModal.supplier} onClose={() => setSupplierModal({ kind: "none" })} />
      )}

      {supplierModal.kind === "edit" && (
        <SupplierModal
          supplier={supplierModal.supplier}
          onClose={() => setSupplierModal({ kind: "none" })}
          onSubmit={async (input) => {
            await updateSupplier(supplierModal.supplier.id, input);
            await load();
            setSupplierModal({ kind: "none" });
          }}
        />
      )}
    </div>
  );
}
