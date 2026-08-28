import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  deletePurchaseOrder,
  PO_STATUS_LABELS,
  PO_STATUS_TONES,
  receivePurchaseOrder,
  setPurchaseOrderStatus,
  type ApiPurchaseOrder,
  type PoStatus,
  type ReceiptLineInput,
} from "../../lib/purchasingApi";
import { useAuth } from "../../state/AuthContext";
import { TotalsPanel } from "./PurchaseOrderModal";

interface DetailProps {
  order: ApiPurchaseOrder;
  onClose: () => void;
  onChanged: () => void;
}

/** What each status can move to by hand. Received/partial are never settable. */
const NEXT_STATUSES: Partial<Record<PoStatus, PoStatus[]>> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  PARTIALLY_RECEIVED: [],
  RECEIVED: [],
  CANCELLED: [],
};

/**
 * §14's purchase-order detail: what was ordered, what has arrived, and the
 * receiving form. Receiving is the only action here that touches stock.
 */
export function PurchaseOrderDetailModal({ order, onClose, onChanged }: DetailProps) {
  const { can } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const [receiptDate, setReceiptDate] = useState(todayIso());
  const [deliveryNote, setDeliveryNote] = useState("");
  const [allowOver, setAllowOver] = useState(false);
  const [draft, setDraft] = useState<Record<string, { quantity: string; batchNumber: string; expiryDate: string }>>({});

  const canReceive = order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED";
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function lineDraft(lineId: string) {
    return draft[lineId] ?? { quantity: "", batchNumber: "", expiryDate: "" };
  }

  async function submitReceipt() {
    const lines: ReceiptLineInput[] = order.lines
      .filter((l) => Number(lineDraft(l.id).quantity) > 0)
      .map((l) => {
        const d = lineDraft(l.id);
        return {
          purchaseOrderLineId: l.id,
          quantity: Number(d.quantity),
          ...(d.batchNumber.trim() ? { batchNumber: d.batchNumber.trim() } : {}),
          ...(d.expiryDate ? { expiryDate: d.expiryDate } : {}),
        };
      });

    if (lines.length === 0) {
      setError("Indiquez la quantité reçue pour au moins une ligne.");
      return;
    }

    const ok = await run(() =>
      receivePurchaseOrder(order.id, {
        date: receiptDate,
        lines,
        ...(deliveryNote.trim() ? { deliveryNote: deliveryNote.trim() } : {}),
        ...(allowOver ? { allowOverDelivery: true } : {}),
      }),
    );
    if (ok) {
      setReceiving(false);
      setDraft({});
      setDeliveryNote("");
      setAllowOver(false);
    }
  }

  return (
    <Modal
      title={`Bon de commande ${order.code}`}
      onClose={onClose}
      width={900}
      footer={
        <>
          <Button onClick={onClose}>Fermer</Button>
          <Button onClick={() => window.print()}>Imprimer</Button>
          {order.status === "DRAFT" && can("purchasing:write") ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Supprimer le brouillon ${order.code} ?`)) {
                  run(() => deletePurchaseOrder(order.id)).then((ok) => ok && onClose());
                }
              }}
            >
              Supprimer
            </Button>
          ) : null}
        </>
      }
    >
      <div className="form-stack">
        <div className="batch-meta">
          <Meta label="Statut" value={<Pill tone={PO_STATUS_TONES[order.status]}>{PO_STATUS_LABELS[order.status]}</Pill>} />
          <Meta label="Fournisseur" value={order.supplier.name} />
          <Meta label="Date" value={formatDate(order.date)} />
          <Meta label="Livraison prévue" value={order.expectedDate ? formatDate(order.expectedDate) : "—"} />
        </div>

        {order.supplier.contactName || order.supplier.phone ? (
          <p className="batch-notes">
            Contact : {order.supplier.contactName ?? "—"}
            {order.supplier.phone ? ` · ${order.supplier.phone}` : ""}
            {order.supplier.email ? ` · ${order.supplier.email}` : ""}
          </p>
        ) : null}

        {order.notes ? <p className="batch-notes">{order.notes}</p> : null}

        <section>
          <h4 className="section-title">Articles commandés</h4>
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th className="num">Commandé</th>
                  <th className="num">Reçu</th>
                  <th className="num">Reste</th>
                  <th className="num">Coût unitaire</th>
                  <th className="num">Total ligne</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id} className={line.outstanding > 0 && order.status !== "CANCELLED" ? "row-attention" : undefined}>
                    <td>
                      {line.item.name}
                      <span className="muted"> · {line.item.reference}</span>
                    </td>
                    <td className="tabular num">{formatQuantity(line.quantity, line.item.unit)}</td>
                    <td className="tabular num">{line.received}</td>
                    <td className="tabular num">{line.outstanding}</td>
                    <td className="tabular num">{formatCurrency(line.unitCost)}</td>
                    <td className="tabular num">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TotalsPanel totals={order.totals} />
        </section>

        {nextStatuses.length > 0 && can("purchasing:approve") ? (
          <section>
            <h4 className="section-title">Changer le statut</h4>
            <div className="row-actions">
              {nextStatuses.map((status) => (
                <Button
                  key={status}
                  variant={status === "CANCELLED" ? "danger" : "secondary"}
                  disabled={busy}
                  onClick={() => run(() => setPurchaseOrderStatus(order.id, status))}
                >
                  {PO_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h4 className="section-title">Réceptions</h4>

          {order.receipts.length === 0 ? (
            <p className="muted">Aucune réception enregistrée.</p>
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Date</th>
                    <th>Bon de livraison</th>
                    <th className="num">Lignes</th>
                  </tr>
                </thead>
                <tbody>
                  {order.receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{receipt.code}</td>
                      <td className="tabular">{formatDate(receipt.date)}</td>
                      <td>{receipt.deliveryNote ?? <span className="muted">—</span>}</td>
                      <td className="tabular num">{receipt.lines.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canReceive && can("purchasing:write") ? (
            receiving ? (
              <div className="form-stack" style={{ marginTop: 14 }}>
                <div className="form-row">
                  <Field label="Date de réception">
                    <input className="input" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
                  </Field>
                  <Field label="Bon de livraison" hint="Numéro du fournisseur, facultatif">
                    <input className="input" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
                  </Field>
                </div>

                {order.lines
                  .filter((l) => l.outstanding > 0 || allowOver)
                  .map((line) => {
                    const d = lineDraft(line.id);
                    const needsBatch = line.item.inventoryType.hasBatches;
                    const needsExpiry = line.item.inventoryType.hasExpiry;
                    return (
                      <div key={line.id} className="receive-line">
                        <div className="receive-line-head">
                          <strong>{line.item.name}</strong>
                          <span className="muted">
                            {line.outstanding} {line.item.unit} restant(s)
                          </span>
                        </div>
                        <div className="form-row">
                          <Field label={`Quantité reçue (${line.item.unit})`}>
                            <input
                              className="input"
                              type="number"
                              min={0}
                              step="any"
                              value={d.quantity}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [line.id]: { ...d, quantity: e.target.value } }))}
                            />
                          </Field>
                          {needsBatch ? (
                            <Field label="Numéro de lot" hint="Obligatoire pour ce produit">
                              <input
                                className="input"
                                value={d.batchNumber}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [line.id]: { ...d, batchNumber: e.target.value } }))}
                              />
                            </Field>
                          ) : null}
                          {needsExpiry ? (
                            <Field label="Péremption" hint="Obligatoire pour ce produit">
                              <input
                                className="input"
                                type="date"
                                value={d.expiryDate}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [line.id]: { ...d, expiryDate: e.target.value } }))}
                              />
                            </Field>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                <label className="checkbox-row">
                  <input type="checkbox" checked={allowOver} onChange={(e) => setAllowOver(e.target.checked)} />
                  <span>
                    Accepter une sur-livraison
                    <span className="checkbox-hint">
                      À cocher seulement si le fournisseur a réellement livré plus que commandé — sinon c'est probablement une faute de frappe.
                    </span>
                  </span>
                </label>

                <Banner tone="info">Enregistrer cette réception augmentera le stock immédiatement.</Banner>

                <div className="row-actions">
                  <Button variant="primary" onClick={submitReceipt} disabled={busy}>
                    {busy ? "Enregistrement…" : "Enregistrer la réception"}
                  </Button>
                  <Button onClick={() => setReceiving(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setReceiving(true)}>
                + Enregistrer une réception
              </Button>
            )
          ) : order.status === "DRAFT" || order.status === "SUBMITTED" ? (
            <Banner tone="info">Ce bon doit être approuvé avant de pouvoir enregistrer une réception.</Banner>
          ) : null}
        </section>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
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
