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
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return fetchCustomer(customer.id)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger la fiche client."));
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
      setError(e instanceof ApiError ? e.message : "Action impossible.");
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
          <Button onClick={onClose}>Fermer</Button>
          {writable ? <Button onClick={() => onEdit(customer)}>Modifier</Button> : null}
          {writable && detail ? (
            <Button variant="ghost" disabled={busy} onClick={() => run(() => setCustomerArchived(customer.id, !detail.archived))}>
              {detail.archived ? "Désarchiver" : "Archiver"}
            </Button>
          ) : null}
          {writable && detail && detail.orders.length === 0 ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Supprimer définitivement ${customer.fullName} ?`)) {
                  run(() => deleteCustomer(customer.id)).then((ok) => ok && onClose());
                }
              }}
            >
              Supprimer
            </Button>
          ) : null}
        </>
      }
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {!detail ? (
        <p className="loading-text">Chargement…</p>
      ) : (
        <div className="form-stack">
          <div className="stat-grid">
            <StatCard label="Commandes" value={detail.summary.orderCount} hint="Hors commandes annulées" />
            <StatCard label="Total acheté" value={formatCurrency(detail.summary.totalPurchased)} />
            <StatCard
              label="Solde dû"
              value={formatCurrency(detail.summary.outstandingBalance)}
              hint="Commandes non payées"
              tone={detail.summary.outstandingBalance > 0 ? "danger" : "ok"}
            />
            <StatCard label="Client depuis" value={formatDate(detail.createdAt)} />
          </div>

          <section>
            <h4 className="section-title">Profil</h4>
            <div className="batch-meta">
              <Meta label="Référence" value={detail.code} />
              <Meta label="Email" value={detail.email ?? "—"} />
              <Meta label="Téléphone" value={detail.phone ?? "—"} />
              <Meta label="Statut" value={<Pill tone={detail.archived ? "neutral" : "ok"}>{detail.archived ? "Archivé" : "Actif"}</Pill>} />
              <Meta label="Adresse" value={detail.address ?? "—"} />
              <Meta label="Ville" value={[detail.postalCode, detail.city].filter(Boolean).join(" ") || "—"} />
              <Meta label="Wilaya / pays" value={[detail.province, detail.country].filter(Boolean).join(", ") || "—"} />
            </div>
            {detail.notes ? <p className="batch-notes">{detail.notes}</p> : null}
          </section>

          <section>
            <h4 className="section-title">Historique des commandes</h4>
            {detail.orders.length === 0 ? (
              <EmptyState title="Aucune commande" description="Ce client n'a pas encore commandé." />
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Date</th>
                      <th>Expédition</th>
                      <th>Paiement</th>
                      <th className="num">Total</th>
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
                          <Pill tone={SHIPMENT_TONES[order.shipmentStatus]}>{SHIPMENT_LABELS[order.shipmentStatus]}</Pill>
                        </td>
                        <td>
                          <Pill tone={PAYMENT_TONES[order.paymentStatus]}>{PAYMENT_LABELS[order.paymentStatus]}</Pill>
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
