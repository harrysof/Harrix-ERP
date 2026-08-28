import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import { fetchSupplierDetail, PO_STATUS_LABELS, PO_STATUS_TONES, type SupplierDetail } from "../../lib/purchasingApi";
import type { Supplier } from "../../lib/suppliersApi";

type Tab = "info" | "items" | "orders" | "receipts";

/**
 * §13's supplier detail page: information, supplied materials, purchase
 * history, purchase orders, deliveries, total purchasing activity and
 * outstanding commitments — all from one call.
 */
export function SupplierDetailModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSupplierDetail(supplier.id)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger la fiche fournisseur."));
  }, [supplier.id]);

  return (
    <Modal title={supplier.name} onClose={onClose} width={900} footer={<Button onClick={onClose}>Fermer</Button>}>
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {!detail ? (
        <p className="loading-text">Chargement…</p>
      ) : (
        <div className="form-stack">
          <div className="stat-grid">
            <StatCard label="Bons de commande" value={detail.summary.purchaseOrderCount} hint={`${detail.summary.openPurchaseOrderCount} en cours`} />
            <StatCard label="Total acheté" value={formatCurrency(detail.summary.totalPurchased)} hint="Hors bons annulés" />
            <StatCard
              label="Engagements"
              value={formatCurrency(detail.summary.outstandingCommitment)}
              hint="Commandé, pas encore livré"
              tone={detail.summary.outstandingCommitment > 0 ? "warn" : "neutral"}
            />
            <StatCard
              label="Dernier achat"
              value={detail.summary.lastPurchaseDate ? formatDate(detail.summary.lastPurchaseDate) : "—"}
            />
          </div>

          <div className="tab-strip">
            <TabButton active={tab === "info"} onClick={() => setTab("info")} label="Informations" />
            <TabButton active={tab === "items"} onClick={() => setTab("items")} label="Matières fournies" count={detail.suppliedItems.length} />
            <TabButton active={tab === "orders"} onClick={() => setTab("orders")} label="Bons de commande" count={detail.purchaseOrders.length} />
            <TabButton active={tab === "receipts"} onClick={() => setTab("receipts")} label="Réceptions" count={detail.receipts.length} />
          </div>

          {tab === "info" ? (
            <div className="batch-meta">
              <Meta label="Contact" value={supplier.contactName ?? "—"} />
              <Meta label="Téléphone" value={supplier.phone ?? "—"} />
              <Meta label="Email" value={supplier.email ?? "—"} />
              <Meta label="Adresse" value={supplier.address ?? "—"} />
              <Meta label="Immatriculation" value={supplier.registration ?? "—"} />
              <Meta label="Statut" value={<Pill tone={supplier.archived ? "neutral" : "ok"}>{supplier.archived ? "Archivé" : "Actif"}</Pill>} />
              <Meta label="Créé le" value={formatDate(supplier.createdAt)} />
            </div>
          ) : null}

          {tab === "info" && supplier.notes ? <p className="batch-notes">{supplier.notes}</p> : null}

          {tab === "items" ? (
            detail.suppliedItems.length === 0 ? (
              <EmptyState
                title="Aucune matière connue"
                description="Les matières apparaissent ici dès qu'un bon de commande ou une réception les mentionne."
              />
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Référence</th>
                      <th className="num">Dernier coût</th>
                      <th>Dernière fois</th>
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
              <EmptyState title="Aucun bon de commande" />
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Date</th>
                      <th className="num">Lignes</th>
                      <th className="num">Total</th>
                      <th>Statut</th>
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
                          <Pill tone={PO_STATUS_TONES[po.status]}>{PO_STATUS_LABELS[po.status]}</Pill>
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
              <h4 className="section-title">Réceptions sur bons de commande</h4>
              {detail.receipts.length === 0 ? (
                <p className="muted">Aucune réception enregistrée sur un bon de commande.</p>
              ) : (
                <div className="table-scroll">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Date</th>
                        <th>Bon de commande</th>
                        <th>Bon de livraison</th>
                        <th className="num">Quantité</th>
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
                Historique complet des entrées
              </h4>
              <p className="field-hint" style={{ marginBottom: 8 }}>
                Toutes les entrées de stock attribuées à ce fournisseur, y compris celles saisies directement dans l'onglet Stock.
              </p>
              {detail.movements.length === 0 ? (
                <p className="muted">Aucune entrée de stock.</p>
              ) : (
                <div className="table-scroll">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Article</th>
                        <th>Lot</th>
                        <th className="num">Quantité</th>
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
