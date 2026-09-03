import { useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  deleteCustomer,
  fetchCustomer,
  setCustomerArchived,
  PAYMENT_LABELS,
  PAYMENT_TONES,
  SHIPMENT_LABELS,
  SHIPMENT_TONES,
  type ApiCustomer,
  type CustomerDetail,
} from "../../lib/salesApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";

interface Props {
  customer: ApiCustomer;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (customer: ApiCustomer) => void;
  onOpenOrder: (orderId: string) => void;
}

/**
 * §19: customer profile, order history, and the three summaries — total
 * orders, total purchased, outstanding balance. All computed server-side from
 * the orders themselves, so they can't drift from the invoices.
 */
export function CustomerDetailModal({ customer, onClose, onChanged, onEdit, onOpenOrder }: Props) {
  const { can } = useAuth();
  const { t } = useI18n();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    return fetchCustomer(customer.id)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("customer.loadFailed")));
  }, [customer.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      await load();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.action"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const writable = can("orders:write");

  return (
    <Modal
      title={customer.fullName}
      onClose={onClose}
      width={880}
      footer={
        <>
          <Button onClick={onClose}>{t("action.close")}</Button>
          {writable ? <Button onClick={() => onEdit(customer)}>{t("action.edit")}</Button> : null}
          {writable && detail ? (
            <Button variant="ghost" disabled={busy} onClick={() => run(() => setCustomerArchived(customer.id, !detail.archived))}>
              {t(detail.archived ? "action.unarchive" : "action.archive")}
            </Button>
          ) : null}
          {writable && detail && detail.orders.length === 0 ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("customer.confirmDelete", { name: customer.fullName }))) {
                  run(() => deleteCustomer(customer.id)).then((ok) => ok && onClose());
                }
              }}
            >
              {t("action.delete")}
            </Button>
          ) : null}
        </>
      }
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {!detail ? (
        <p className="loading-text">{t("state.loading")}</p>
      ) : (
        <div className="form-stack">
          <div className="stat-grid">
            <StatCard
              label={t("sales.col.orders")}
              value={detail.summary.orderCount}
              hint={t("customer.excludingCancelled")}
            />
            <StatCard label={t("sales.col.totalPurchased")} value={formatCurrency(detail.summary.totalPurchased)} />
            <StatCard
              label={t("sales.col.balanceDue")}
              value={formatCurrency(detail.summary.outstandingBalance)}
              hint={t("customer.unpaidOrders")}
              tone={detail.summary.outstandingBalance > 0 ? "danger" : "ok"}
            />
            <StatCard label={t("customer.since")} value={formatDate(detail.createdAt)} />
          </div>

          <section>
            <h4 className="section-title">{t("customer.profile")}</h4>
            <div className="batch-meta">
              <Meta label={t("field.reference")} value={detail.code} />
              <Meta label={t("field.email")} value={detail.email ?? "—"} />
              <Meta label={t("field.phone")} value={detail.phone ?? "—"} />
              <Meta
                label={t("field.status")}
                value={
                  <Pill tone={detail.archived ? "neutral" : "ok"}>
                    {t(detail.archived ? "state.archived" : "state.active")}
                  </Pill>
                }
              />
              <Meta label={t("field.address")} value={detail.address ?? "—"} />
              <Meta label={t("customer.cityLabel")} value={[detail.postalCode, detail.city].filter(Boolean).join(" ") || "—"} />
              <Meta
                label={t("customer.provinceCountry")}
                value={[detail.province, detail.country].filter(Boolean).join(", ") || "—"}
              />
            </div>
            {detail.notes ? <p className="batch-notes">{detail.notes}</p> : null}
          </section>

          <section>
            <h4 className="section-title">{t("customer.orderHistory")}</h4>
            {detail.orders.length === 0 ? (
              <EmptyState title={t("sales.noOrders")} description={t("customer.neverOrdered")} />
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("field.number")}</th>
                      <th>{t("field.date")}</th>
                      <th>{t("sales.shipment")}</th>
                      <th>{t("field.payment")}</th>
                      <th className="num">{t("field.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => {
                              onClose();
                              onOpenOrder(order.id);
                            }}
                          >
                            {order.code}
                          </button>
                        </td>
                        <td className="tabular">{formatDate(order.date)}</td>
                        <td>
                          <Pill tone={SHIPMENT_TONES[order.shipmentStatus]}>{t(SHIPMENT_LABELS[order.shipmentStatus])}</Pill>
                        </td>
                        <td>
                          <Pill tone={PAYMENT_TONES[order.paymentStatus]}>{t(PAYMENT_LABELS[order.paymentStatus])}</Pill>
                        </td>
                        <td className="tabular num">{formatCurrency(order.totals.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
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
