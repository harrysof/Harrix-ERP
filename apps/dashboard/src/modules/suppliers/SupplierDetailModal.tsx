import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import {
  fetchSupplierDetail,
  PO_PAYMENT_LABELS,
  PO_PAYMENT_TONES,
  PO_STATUS_LABELS,
  PO_STATUS_TONES,
  type SupplierDetail,
} from "../../lib/purchasingApi";
import type { Supplier } from "../../lib/suppliersApi";
import { useI18n } from "../../state/LanguageContext";

type Tab = "info" | "items" | "orders" | "receipts";

/**
 * §13's supplier detail page: information, supplied materials, purchase
 * history, purchase orders, deliveries, total purchasing activity and
 * outstanding commitments — all from one call.
 */
export function SupplierDetailModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSupplierDetail(supplier.id)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("supplier.loadFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier.id]);

  return (
    <Modal title={supplier.name} onClose={onClose} width={900} footer={<Button onClick={onClose}>{t("action.close")}</Button>}>
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {!detail ? (
        <p className="loading-text">{t("state.loading")}</p>
      ) : (
        <div className="form-stack">
          <div className="stat-grid">
            <StatCard
              label={t("po.tabOrders")}
              value={detail.summary.purchaseOrderCount}
              hint={t("supplier.openOrders", { count: detail.summary.openPurchaseOrderCount })}
            />
            <StatCard
              label={t("supplier.totalPurchased")}
              value={formatCurrency(detail.summary.totalPurchased)}
              hint={t("po.kpi.totalHint")}
            />
            <StatCard
              label={t("po.commitments")}
              value={formatCurrency(detail.summary.outstandingCommitment)}
              hint={t("po.kpi.ordered")}
              tone={detail.summary.outstandingCommitment > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label={t("supplier.due")}
              value={formatCurrency(detail.summary.amountOwed)}
              hint={t("supplier.dueHint")}
              tone={detail.summary.amountOwed > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label={t("supplier.lastPurchase")}
              value={detail.summary.lastPurchaseDate ? formatDate(detail.summary.lastPurchaseDate) : "—"}
            />
          </div>

          <div className="tab-strip">
            <TabButton active={tab === "info"} onClick={() => setTab("info")} label={t("supplier.tabInfo")} />
            <TabButton active={tab === "items"} onClick={() => setTab("items")} label={t("supplier.materials")} count={detail.suppliedItems.length} />
            <TabButton active={tab === "orders"} onClick={() => setTab("orders")} label={t("po.tabOrders")} count={detail.purchaseOrders.length} />
            <TabButton active={tab === "receipts"} onClick={() => setTab("receipts")} label={t("po.receipts")} count={detail.receipts.length} />
          </div>

          {tab === "info" ? (
            <div className="batch-meta">
              <Meta label={t("po.col.contact")} value={supplier.contactName ?? "—"} />
              <Meta label={t("field.phone")} value={supplier.phone ?? "—"} />
              <Meta label={t("field.email")} value={supplier.email ?? "—"} />
              <Meta label={t("field.address")} value={supplier.address ?? "—"} />
              <Meta label={t("supplier.registration")} value={supplier.registration ?? "—"} />
              <Meta
                label={t("field.status")}
                value={
                  <Pill tone={supplier.archived ? "neutral" : "ok"}>
                    {t(supplier.archived ? "state.archived" : "state.active")}
                  </Pill>
                }
              />
              <Meta label={t("supplier.createdOn")} value={formatDate(supplier.createdAt)} />
            </div>
          ) : null}

          {tab === "info" && supplier.notes ? <p className="batch-notes">{supplier.notes}</p> : null}

          {tab === "items" ? (
            detail.suppliedItems.length === 0 ? (
              <EmptyState
                title={t("supplier.noMaterials")}
                description={t("supplier.materialsAppear")}
              />
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("field.item")}</th>
                      <th>{t("field.reference")}</th>
                      <th className="num">{t("supplier.lastCost")}</th>
                      <th>{t("supplier.lastTime")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.suppliedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td className="tabular">{item.reference}</td>
                        <td className="tabular num">
                          {item.lastUnitCost === null ? <span className="muted">—</span> : formatCurrency(item.lastUnitCost)}
                        </td>
                        <td className="tabular">{item.lastDate ? formatDate(item.lastDate) : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === "orders" ? (
            detail.purchaseOrders.length === 0 ? (
              <EmptyState title={t("po.none")} />
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("field.number")}</th>
                      <th>{t("field.date")}</th>
                      <th className="num">{t("po.col.lines")}</th>
                      <th className="num">{t("field.total")}</th>
                      <th>{t("field.status")}</th>
                      <th>{t("field.payment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.purchaseOrders.map((po) => (
                      <tr key={po.id}>
                        <td className="tabular">{po.code}</td>
                        <td className="tabular">{formatDate(po.date)}</td>
                        <td className="tabular num">{po.lines.length}</td>
                        <td className="tabular num">{formatCurrency(po.totals.total)}</td>
                        <td>
                          <Pill tone={PO_STATUS_TONES[po.status]}>{t(PO_STATUS_LABELS[po.status])}</Pill>
                        </td>
                        <td>
                          <Pill tone={PO_PAYMENT_TONES[po.paymentStatus]}>{t(PO_PAYMENT_LABELS[po.paymentStatus])}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === "receipts" ? (
            <>
              <h4 className="section-title">{t("supplier.receiptsOnOrders")}</h4>
              {detail.receipts.length === 0 ? (
                <p className="muted">{t("supplier.noReceiptsOnOrders")}</p>
              ) : (
                <div className="table-scroll">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>{t("field.number")}</th>
                        <th>{t("field.date")}</th>
                        <th>{t("po.label")}</th>
                        <th>{t("po.deliveryNote")}</th>
                        <th className="num">{t("field.quantity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.receipts.map((r) => (
                        <tr key={r.id}>
                          <td className="tabular">{r.code}</td>
                          <td className="tabular">{formatDate(r.date)}</td>
                          <td className="tabular">{r.purchaseOrderCode}</td>
                          <td>{r.deliveryNote ?? <span className="muted">—</span>}</td>
                          <td className="tabular num">{r.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h4 className="section-title" style={{ marginTop: 18 }}>
                {t("supplier.allEntries")}
              </h4>
              <p className="field-hint" style={{ marginBottom: 8 }}>
                {t("supplier.allEntriesHint")}
              </p>
              {detail.movements.length === 0 ? (
                <p className="muted">{t("supplier.noEntries")}</p>
              ) : (
                <div className="table-scroll">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>{t("field.date")}</th>
                        <th>{t("field.item")}</th>
                        <th>{t("field.batch")}</th>
                        <th className="num">{t("field.quantity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.movements.map((m) => (
                        <tr key={m.id}>
                          <td className="tabular">{formatDate(m.date)}</td>
                          <td>{m.item?.name ?? "—"}</td>
                          <td>{m.batch?.batchNumber ?? <span className="muted">—</span>}</td>
                          <td className="tabular num">{m.item ? formatQuantity(m.quantity, m.item.unit) : m.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button type="button" className={`tab-strip-item ${active ? "tab-strip-item-active" : ""}`} onClick={onClick}>
      {label}
      {count !== undefined && count > 0 ? <span className="tab-strip-badge">{count}</span> : null}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="batch-meta-item">
      <span className="batch-meta-label">{label}</span>
      <span className="batch-meta-value">{value}</span>
    </div>
  );
}
