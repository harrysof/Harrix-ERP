import { useCallback, useEffect, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import { fetchSuppliers, type Supplier } from "../../lib/suppliersApi";
import {
  fetchPurchaseOrders,
  PO_STATUS_LABELS,
  PO_STATUS_ORDER,
  PO_STATUS_TONES,
  type ApiPurchaseOrder,
  type PoFilters,
} from "../../lib/purchasingApi";
import { useAuth } from "../../state/AuthContext";
import { PurchaseOrderModal } from "./PurchaseOrderModal";
import { PurchaseOrderDetailModal } from "./PurchaseOrderDetailModal";

/**
 * §14: the purchase-order list. The flow the whole module encodes is
 * Supplier → Purchase Order → Delivery → Inventory, and the "Reçu" column
 * makes the middle step visible: an approved order that hasn't arrived is a
 * commitment, not stock.
 */
export function PurchasingPage() {
  const { can } = useAuth();
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [filters, setFilters] = useState<PoFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchPurchaseOrders(filters), fetchSuppliers(), fetchItems()])
      .then(([nextOrders, nextSuppliers, nextItems]) => {
        setOrders(nextOrders);
        setSuppliers(nextSuppliers);
        setItems(nextItems);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les achats."))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<PoFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);
  const openOrder = orders.find((o) => o.id === openId) ?? null;

  // Materials only — you don't buy your own finished goods.
  const purchasableItems = items.filter((i) => i.inventoryType.key !== "finished-goods");

  const open = orders.filter((o) => o.status !== "RECEIVED" && o.status !== "CANCELLED");
  const committed = open.reduce(
    (sum, o) => sum + o.lines.reduce((s, l) => s + l.outstanding * l.unitCost, 0),
    0,
  );

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="stat-grid">
        <StatCard label="Bons de commande" value={orders.length} hint="Sur la période filtrée" />
        <StatCard label="En cours" value={open.length} hint="Ni reçus ni annulés" tone={open.length > 0 ? "warn" : "neutral"} />
        <StatCard label="Engagements" value={formatCurrency(committed)} hint="Commandé, pas encore livré" />
        <StatCard
          label="Total achats"
          value={formatCurrency(orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.totals.total, 0))}
          hint="Hors bons annulés"
        />
      </div>

      <div className="toolbar">
        <div className="filter-bar" style={{ flex: 1 }}>
          <Field label="Fournisseur">
            <select className="input" value={filters.supplierId ?? ""} onChange={(e) => set({ supplierId: e.target.value })}>
              <option value="">Tous</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select className="input" value={filters.status ?? ""} onChange={(e) => set({ status: e.target.value })}>
              <option value="">Tous</option>
              {PO_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PO_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Du">
            <input className="input" type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
          </Field>
          <Field label="Au">
            <input className="input" type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
          </Field>
          {hasFilters ? (
            <Button variant="ghost" onClick={() => setFilters({})}>
              Réinitialiser
            </Button>
          ) : null}
        </div>
        {can("purchasing:write") ? (
          <div className="toolbar-actions">
            <Button variant="primary" onClick={() => setCreating(true)} disabled={suppliers.length === 0}>
              + Nouveau bon de commande
            </Button>
          </div>
        ) : null}
      </div>

      {suppliers.length === 0 && !loading ? (
        <Banner tone="info">Ajoutez d'abord un fournisseur dans l'onglet Fournisseurs.</Banner>
      ) : null}

      {loading ? (
        <p className="loading-text">Chargement des achats…</p>
      ) : orders.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Aucun bon de commande ne correspond" : "Aucun bon de commande"}
          description={hasFilters ? "Élargissez la période ou réinitialisez les filtres." : "Créez un bon de commande pour suivre vos achats."}
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Livraison prévue</th>
                <th className="num">Lignes</th>
                <th className="num">Reçu</th>
                <th className="num">Total</th>
                <th>Statut</th>
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
                      {late ? <span className="muted"> · en retard</span> : null}
                    </td>
                    <td className="tabular num">{order.lines.length}</td>
                    <td className="tabular num">
                      {received} / {ordered}
                    </td>
                    <td className="tabular num">{formatCurrency(order.totals.total)}</td>
                    <td>
                      <Pill tone={PO_STATUS_TONES[order.status]}>{PO_STATUS_LABELS[order.status]}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <PurchaseOrderModal
          suppliers={suppliers}
          items={purchasableItems}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      ) : null}

      {openOrder ? (
        <PurchaseOrderDetailModal order={openOrder} onClose={() => setOpenId(null)} onChanged={load} />
      ) : null}
    </div>
  );
}
