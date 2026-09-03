import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Truck, Wallet, CircleAlert, Eye, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { Avatar } from "../../components/ui/Avatar";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import {
  fetchCustomers,
  fetchOrders,
  fetchOrdersSummary,
  setCustomerArchived,
  setOrderArchived,
  PAYMENT_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_TONES,
  SHIPMENT_LABELS,
  SHIPMENT_STATUSES,
  SHIPMENT_TONES,
  type ApiCustomer,
  type ApiOrder,
  type OrderFilters,
  type OrdersSummary,
} from "../../lib/salesApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import { OrderModal } from "./OrderModal";
import { OrderDetailModal } from "./OrderDetailModal";
import { CustomerModal } from "./CustomerModal";
import { CustomerDetailModal } from "./CustomerDetailModal";

type Tab = "orders" | "customers";
type Modal =
  | { kind: "none" }
  | { kind: "newOrder" }
  | { kind: "editOrder"; order: ApiOrder }
  | { kind: "orderDetail"; id: string }
  | { kind: "newCustomer" }
  | { kind: "editCustomer"; customer: ApiCustomer }
  | { kind: "customerDetail"; customer: ApiCustomer };

/** §15–19: the sales module — order list, order details, and customers. */
export function SalesPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [products, setProducts] = useState<ApiItem[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedOrders, setShowArchivedOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>({ kind: "none" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    setLoading(true);
    const orderFilters = { ...filters, includeArchived: showArchivedOrders };
    return Promise.all([fetchOrders(orderFilters), fetchCustomers(true), fetchOrdersSummary(orderFilters), fetchItems()])
      .then(([nextOrders, nextCustomers, nextSummary, items]) => {
        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setSummary(nextSummary);
        setProducts(items.filter((i) => i.inventoryType.key === "finished-goods"));
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("sales.loadFailed")))
      .finally(() => setLoading(false));
  }, [filters, showArchivedOrders]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<OrderFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);
  const writable = can("orders:write");

  const activeCustomers = customers.filter((c) => !c.archived);
  const visibleCustomers = showArchived ? customers : activeCustomers;
  const openOrder = modal.kind === "orderDetail" ? orders.find((o) => o.id === modal.id) ?? null : null;

  async function toggleCustomerArchive(customer: ApiCustomer) {
    await setCustomerArchived(customer.id, !customer.archived);
    await load();
  }

  async function toggleOrderArchive(order: ApiOrder) {
    await setOrderArchived(order.id, !order.archived);
    await load();
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {summary ? (
        <div className="stat-grid">
          <StatCard
            icon={ClipboardList}
            label={t("sales.kpi.orders")}
            value={summary.orderCount}
            hint={t("sales.kpi.pending", { count: summary.pendingShipment })}
          />
          <StatCard icon={Truck} label={t("sales.kpi.shipped")} value={summary.shipped} tone="ok" />
          <StatCard
            icon={Wallet}
            label={t("sales.kpi.revenue")}
            value={formatCurrency(summary.revenue)}
            hint={t("sales.kpi.revenueHint")}
          />
          <StatCard
            icon={CircleAlert}
            label={t("sales.kpi.outstanding")}
            value={formatCurrency(summary.outstanding)}
            hint={t("sales.kpi.outstandingHint")}
            tone={summary.outstanding > 0 ? "danger" : "ok"}
          />
        </div>
      ) : null}

      <div className="toolbar">
        <div className="tab-strip">
          <button type="button" className={`tab-strip-item ${tab === "orders" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("orders")}>
            {t("sales.tabOrders")}
            {orders.length > 0 ? <span className="tab-strip-badge">{orders.length}</span> : null}
          </button>
          <button
            type="button"
            className={`tab-strip-item ${tab === "customers" ? "tab-strip-item-active" : ""}`}
            onClick={() => setTab("customers")}
          >
            {t("sales.tabCustomers")}
            {activeCustomers.length > 0 ? <span className="tab-strip-badge">{activeCustomers.length}</span> : null}
          </button>
        </div>
        {writable ? (
          <div className="toolbar-actions">
            {tab === "orders" ? (
              <Button variant="primary" onClick={() => setModal({ kind: "newOrder" })} disabled={activeCustomers.length === 0}>
                {t("sales.newOrder")}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setModal({ kind: "newCustomer" })}>
                {t("sales.newCustomer")}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {tab === "orders" && activeCustomers.length === 0 && !loading ? (
        <Banner tone="info">{t("sales.customerFirst")}</Banner>
      ) : null}

      {tab === "orders" ? (
        <>
          <div className="filter-bar">
            <Field label={t("sales.search")} hint={t("sales.searchHint")}>
              <input className="input" value={filters.search ?? ""} onChange={(e) => set({ search: e.target.value })} placeholder={t("sales.searchPlaceholder")} />
            </Field>
            <Field label={t("sales.shipment")}>
              <select className="input" value={filters.shipmentStatus ?? ""} onChange={(e) => set({ shipmentStatus: e.target.value })}>
                <option value="">{t("state.allFeminine")}</option>
                {SHIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(SHIPMENT_LABELS[s])}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("field.payment")}>
              <select className="input" value={filters.paymentStatus ?? ""} onChange={(e) => set({ paymentStatus: e.target.value })}>
                <option value="">{t("state.all")}</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(PAYMENT_LABELS[s])}
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
            <label className="checkbox-row">
              <input type="checkbox" checked={showArchivedOrders} onChange={(e) => setShowArchivedOrders(e.target.checked)} />
              <span>{t("sales.showArchivedOrders")}</span>
            </label>
            {hasFilters ? (
              <Button variant="ghost" onClick={() => setFilters({})}>
                {t("action.reset")}
              </Button>
            ) : null}
          </div>

          {loading ? (
            <p className="loading-text">{t("sales.loadingOrders")}</p>
          ) : orders.length === 0 ? (
            <EmptyState
              title={hasFilters ? t("sales.noOrderMatch") : t("sales.noOrders")}
              description={hasFilters ? t("sales.widenSearch") : undefined}
            />
          ) : (
            <div className="list-card">
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("sales.col.orderNumber")}</th>
                      <th>{t("field.date")}</th>
                      <th>{t("field.customer")}</th>
                      <th>{t("field.email")}</th>
                      <th>{t("sales.shipment")}</th>
                      <th>{t("field.payment")}</th>
                      <th className="num">{t("field.total")}</th>
                      <th aria-label={t("field.actions")} />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className={
                          order.archived || order.shipmentStatus === "CANCELLED"
                            ? "row-muted"
                            : order.stockWarnings.length > 0
                              ? "row-attention"
                              : undefined
                        }
                      >
                        <td>
                          <button type="button" className="link-button" onClick={() => setModal({ kind: "orderDetail", id: order.id })}>
                            {order.code}
                          </button>
                          {order.stockWarnings.length > 0 ? (
                            <span className="muted" title={t("sales.stockWarning")}>
                              {" "}
                              ⚠
                            </span>
                          ) : null}
                        </td>
                        <td className="tabular">{formatDate(order.date)}</td>
                        <td>
                          <div className="identity-cell">
                            <Avatar name={order.customer.fullName} />
                            <span className="identity-cell-name">{order.customer.fullName}</span>
                          </div>
                        </td>
                        <td>{order.customer.email ?? <span className="muted">—</span>}</td>
                        <td>
                          <Pill tone={SHIPMENT_TONES[order.shipmentStatus]}>{t(SHIPMENT_LABELS[order.shipmentStatus])}</Pill>
                        </td>
                        <td>
                          <Pill tone={PAYMENT_TONES[order.paymentStatus]}>{t(PAYMENT_LABELS[order.paymentStatus])}</Pill>
                        </td>
                        <td className="tabular num">{formatCurrency(order.totals.total)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button"
                              title={t("sales.view")}
                              onClick={() => setModal({ kind: "orderDetail", id: order.id })}
                            >
                              <Eye size={16} strokeWidth={2} />
                            </button>
                            {writable && order.canEdit ? (
                              <button
                                type="button"
                                className="icon-button"
                                title={t("action.edit")}
                                onClick={() => setModal({ kind: "editOrder", order })}
                              >
                                <Pencil size={16} strokeWidth={2} />
                              </button>
                            ) : null}
                            {writable ? (
                              <button
                                type="button"
                                className="icon-button"
                                title={t(order.archived ? "action.unarchive" : "action.archive")}
                                onClick={() => toggleOrderArchive(order)}
                              >
                                {order.archived ? <ArchiveRestore size={16} strokeWidth={2} /> : <Archive size={16} strokeWidth={2} />}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="toolbar">
            <label className="checkbox-row">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              <span>{t("sales.showArchivedCustomers")}</span>
            </label>
          </div>

          {loading ? (
            <p className="loading-text">{t("sales.loadingCustomers")}</p>
          ) : visibleCustomers.length === 0 ? (
            <EmptyState title={t("sales.noCustomers")} description={t("sales.noCustomersDesc")} />
          ) : (
            <div className="list-card">
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("field.fullName")}</th>
                      <th>{t("field.email")}</th>
                      <th>{t("field.phone")}</th>
                      <th className="num">{t("sales.col.orders")}</th>
                      <th className="num">{t("sales.col.totalPurchased")}</th>
                      <th className="num">{t("sales.col.balanceDue")}</th>
                      <th>{t("field.status")}</th>
                      <th>{t("sales.col.createdOn")}</th>
                      <th aria-label={t("field.actions")} />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCustomers.map((customer) => (
                      <tr key={customer.id} className={customer.archived ? "row-muted" : undefined}>
                        <td>
                          <div className="identity-cell">
                            <Avatar name={customer.fullName} />
                            {can("orders:read") ? (
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => setModal({ kind: "customerDetail", customer })}
                              >
                                {customer.fullName}
                              </button>
                            ) : (
                              <span className="identity-cell-name">{customer.fullName}</span>
                            )}
                          </div>
                        </td>
                        <td>{customer.email ?? <span className="muted">—</span>}</td>
                        <td className="tabular">{customer.phone ?? <span className="muted">—</span>}</td>
                        <td className="tabular num">{customer.orderCount}</td>
                        <td className="tabular num">{formatCurrency(customer.totalPurchased)}</td>
                        <td className="tabular num">
                          {customer.outstandingBalance > 0 ? (
                            <strong>{formatCurrency(customer.outstandingBalance)}</strong>
                          ) : (
                            formatCurrency(0)
                          )}
                        </td>
                        <td>
                          <Pill tone={customer.archived ? "neutral" : "ok"}>{t(customer.archived ? "state.archived" : "state.active")}</Pill>
                        </td>
                        <td className="tabular">{formatDate(customer.createdAt)}</td>
                        <td>
                          <div className="row-actions">
                            {can("orders:read") ? (
                              <button
                                type="button"
                                className="icon-button"
                                title={t("sales.file")}
                                onClick={() => setModal({ kind: "customerDetail", customer })}
                              >
                                <Eye size={16} strokeWidth={2} />
                              </button>
                            ) : null}
                            {writable ? (
                              <>
                                <button
                                  type="button"
                                  className="icon-button"
                                  title={t("action.edit")}
                                  onClick={() => setModal({ kind: "editCustomer", customer })}
                                >
                                  <Pencil size={16} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  title={t(customer.archived ? "action.unarchive" : "action.archive")}
                                  onClick={() => toggleCustomerArchive(customer)}
                                >
                                  {customer.archived ? <ArchiveRestore size={16} strokeWidth={2} /> : <Archive size={16} strokeWidth={2} />}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {modal.kind === "newOrder" || modal.kind === "editOrder" ? (
        <OrderModal
          customers={activeCustomers}
          products={products}
          order={modal.kind === "editOrder" ? modal.order : undefined}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => {
            setModal({ kind: "none" });
            load();
          }}
        />
      ) : null}

      {openOrder ? (
        <OrderDetailModal
          order={openOrder}
          onClose={() => setModal({ kind: "none" })}
          onChanged={load}
          onEdit={() => setModal({ kind: "editOrder", order: openOrder })}
        />
      ) : null}

      {modal.kind === "newCustomer" || modal.kind === "editCustomer" ? (
        <CustomerModal
          customer={modal.kind === "editCustomer" ? modal.customer : null}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => {
            setModal({ kind: "none" });
            load();
          }}
        />
      ) : null}

      {modal.kind === "customerDetail" ? (
        <CustomerDetailModal
          customer={modal.customer}
          onClose={() => setModal({ kind: "none" })}
          onChanged={load}
          onEdit={(customer) => setModal({ kind: "editCustomer", customer })}
          onOpenOrder={(id) => setModal({ kind: "orderDetail", id })}
        />
      ) : null}
    </div>
  );
}
