import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { Field } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  deleteOrder,
  returnOrder,
  setOrderArchived,
  setOrderStatus,
  shipOrder,
  PAYMENT_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_TONES,
  SHIPMENT_LABELS,
  SHIPMENT_TONES,
  type ApiOrder,
  type ReturnOrderLineInput,
} from "../../lib/salesApi";
import { useAuth } from "../../state/AuthContext";
import { OrderTotalsPanel } from "./OrderTotalsPanel";

interface OrderDetailModalProps {
  order: ApiOrder;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
}

/**
 * §17: the invoice-style order view — items, totals, customer info, shipping
 * info, statuses, and the actions the order's own state actually permits.
 *
 * Which actions appear comes from the backend's canEdit/canShip/canCancel
 * flags rather than from rules re-implemented here, so a button never offers
 * something the server will refuse.
 */
export function OrderDetailModal({ order, onClose, onChanged, onEdit }: OrderDetailModalProps) {
  const { can } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [shipDate, setShipDate] = useState(todayIso());
  const [markPaid, setMarkPaid] = useState(false);

  const [returning, setReturning] = useState(false);
  const [returnDate, setReturnDate] = useState(todayIso());
  const [returnReason, setReturnReason] = useState("");
  const [returnDraft, setReturnDraft] = useState<Record<string, string>>({});

  const writable = can("orders:write");

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

  async function submitReturn() {
    const lines: ReturnOrderLineInput[] = order.lines
      .filter((l) => Number(returnDraft[l.id]) > 0)
      .map((l) => ({ orderLineId: l.id, quantity: Number(returnDraft[l.id]) }));

    if (lines.length === 0) {
      setError("Indiquez la quantité retournée pour au moins une ligne.");
      return;
    }

    const ok = await run(() =>
      returnOrder(order.id, { date: returnDate, lines, ...(returnReason.trim() ? { reason: returnReason.trim() } : {}) }),
    );
    if (ok) {
      setReturning(false);
      setReturnDraft({});
      setReturnReason("");
    }
  }

  return (
    <Modal
      title={`Commande ${order.code}`}
      onClose={onClose}
      width={900}
      footer={
        <>
          <Button onClick={onClose}>Fermer</Button>
          <Button onClick={() => window.print()}>Imprimer</Button>
          {writable && order.canEdit ? <Button onClick={onEdit}>Modifier</Button> : null}
          {writable ? (
            <Button variant="ghost" disabled={busy} onClick={() => run(() => setOrderArchived(order.id, !order.archived))}>
              {order.archived ? "Désarchiver" : "Archiver"}
            </Button>
          ) : null}
          {writable && order.canCancel ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Annuler la commande ${order.code} ?`)) {
                  run(() => setOrderStatus(order.id, { shipmentStatus: "CANCELLED", paymentStatus: "CANCELLED" }));
                }
              }}
            >
              Annuler la commande
            </Button>
          ) : null}
          {writable && order.shipmentStatus !== "SHIPPED" ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Supprimer définitivement la commande ${order.code} ?`)) {
                  run(() => deleteOrder(order.id)).then((ok) => ok && onClose());
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
        <div className="invoice-head">
          <div>
            <p className="invoice-label">Commande</p>
            <p className="invoice-code">{order.code}</p>
            <p className="muted">{formatDate(order.date)}</p>
          </div>
          <div className="invoice-status">
            <Pill tone={SHIPMENT_TONES[order.shipmentStatus]}>Expédition : {SHIPMENT_LABELS[order.shipmentStatus]}</Pill>
            <Pill tone={PAYMENT_TONES[order.paymentStatus]}>Paiement : {PAYMENT_LABELS[order.paymentStatus]}</Pill>
            {order.archived ? <Pill tone="neutral">Archivée</Pill> : null}
          </div>
        </div>

        {order.stockWarnings.length > 0 ? (
          <Banner tone="warn">
            Stock insuffisant pour expédier cette commande aujourd'hui :{" "}
            {order.stockWarnings
              .map((w) => `${w.itemName} — ${w.available} ${w.unit} en stock, ${w.required} demandé(s)`)
              .join(" · ")}
            . La commande reste valable ; produisez ou réceptionnez la différence avant de l'expédier.
          </Banner>
        ) : null}

        <section>
          <h4 className="section-title">Articles</h4>
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Référence</th>
                  <th className="num">Quantité</th>
                  <th className="num">Prix unitaire</th>
                  <th className="num">Remise</th>
                  <th className="num">Total ligne</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.item.name}</td>
                    <td className="tabular">{line.item.reference}</td>
                    <td className="tabular num">
                      {line.quantity} {line.item.unit}
                    </td>
                    <td className="tabular num">{formatCurrency(line.unitPrice)}</td>
                    <td className="tabular num">{line.discount ? formatCurrency(line.discount) : <span className="muted">—</span>}</td>
                    <td className="tabular num">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OrderTotalsPanel totals={order.totals} />
        </section>

        <div className="invoice-columns">
          <section>
            <h4 className="section-title">Client</h4>
            <div className="invoice-block">
              <p className="invoice-block-strong">{order.customer.fullName}</p>
              <p>{order.customer.email ?? <span className="muted">Pas d'email</span>}</p>
              <p>{order.customer.phone ?? <span className="muted">Pas de téléphone</span>}</p>
            </div>
          </section>

          <section>
            <h4 className="section-title">Livraison</h4>
            <div className="invoice-block">
              <p className="invoice-block-strong">{order.shipToName ?? order.customer.fullName}</p>
              <p>{order.shipToAddress ?? <span className="muted">Pas d'adresse</span>}</p>
              <p>
                {[order.shipToPostalCode, order.shipToCity].filter(Boolean).join(" ") || <span className="muted">—</span>}
              </p>
              <p>{[order.shipToProvince, order.shipToCountry].filter(Boolean).join(", ") || <span className="muted">—</span>}</p>
              {order.shipToPhone ? <p>{order.shipToPhone}</p> : null}
              {order.shippedAt ? <p className="muted">Expédié le {formatDate(order.shippedAt)}</p> : null}
            </div>
          </section>
        </div>

        {order.notes ? <p className="batch-notes">{order.notes}</p> : null}

        {writable ? (
          <section>
            <h4 className="section-title">Statut</h4>

            {order.canShip ? (
              shipping ? (
                <div className="form-stack">
                  <div className="form-row">
                    <Field label="Date d'expédition">
                      <input className="input" type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} />
                    </Field>
                  </div>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
                    <span>Marquer aussi comme payée</span>
                  </label>
                  <Banner tone="warn">
                    L'expédition sortira {order.lines.reduce((s, l) => s + l.quantity, 0)} unité(s) du stock de produits finis. Cette
                    action ne peut pas être annulée.
                  </Banner>
                  <div className="row-actions">
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => run(() => shipOrder(order.id, { date: shipDate, markPaid })).then((ok) => ok && setShipping(false))}
                    >
                      {busy ? "Expédition…" : "Confirmer l'expédition"}
                    </Button>
                    <Button onClick={() => setShipping(false)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" onClick={() => setShipping(true)}>
                  Expédier la commande
                </Button>
              )
            ) : null}

            <div className="form-row" style={{ marginTop: 12 }}>
              <Field
                label="Statut de paiement"
                hint={
                  order.shipmentStatus === "SHIPPED"
                    ? "Ne touche pas au stock. Pour reprendre des articles déjà expédiés, utilisez « Enregistrer un retour » ci-dessous."
                    : undefined
                }
              >
                <select
                  className="input"
                  value={order.paymentStatus}
                  disabled={busy}
                  onChange={(e) => run(() => setOrderStatus(order.id, { paymentStatus: e.target.value }))}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PAYMENT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
        ) : null}

        {order.shipmentStatus === "SHIPPED" || order.returns.length > 0 ? (
          <section>
            <h4 className="section-title">Retours</h4>

            {order.returns.length === 0 ? (
              <p className="muted">Aucun retour enregistré.</p>
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Date</th>
                      <th>Motif</th>
                      <th className="num">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.returns.map((ret) => (
                      <tr key={ret.id}>
                        <td>{ret.code}</td>
                        <td className="tabular">{formatDate(ret.date)}</td>
                        <td>{ret.reason ?? <span className="muted">—</span>}</td>
                        <td className="tabular num">{ret.lines.reduce((s, l) => s + l.quantity, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {writable && order.canReturn ? (
              returning ? (
                <div className="form-stack" style={{ marginTop: 14 }}>
                  <div className="form-row">
                    <Field label="Date du retour">
                      <input className="input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                    </Field>
                    <Field label="Motif" hint="Facultatif — ex. « ne convient pas au client »">
                      <input className="input" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
                    </Field>
                  </div>

                  {order.lines
                    .filter((l) => l.returnable > 0)
                    .map((line) => (
                      <div key={line.id} className="receive-line">
                        <div className="receive-line-head">
                          <strong>{line.item.name}</strong>
                          <span className="muted">
                            {line.returnable} {line.item.unit} retournable(s)
                          </span>
                        </div>
                        <Field label={`Quantité retournée (${line.item.unit})`}>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={line.returnable}
                            step="any"
                            value={returnDraft[line.id] ?? ""}
                            onChange={(e) => setReturnDraft((prev) => ({ ...prev, [line.id]: e.target.value }))}
                          />
                        </Field>
                      </div>
                    ))}

                  <Banner tone="info">Enregistrer ce retour remettra les quantités indiquées dans le stock de produits finis.</Banner>

                  <div className="row-actions">
                    <Button variant="primary" onClick={submitReturn} disabled={busy}>
                      {busy ? "Enregistrement…" : "Enregistrer le retour"}
                    </Button>
                    <Button onClick={() => setReturning(false)}>Annuler</Button>
                  </div>
                </div>
              ) : order.lines.some((l) => l.returnable > 0) ? (
                <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setReturning(true)}>
                  + Enregistrer un retour
                </Button>
              ) : (
                <p className="muted" style={{ marginTop: 10 }}>
                  Tout a déjà été retourné.
                </p>
              )
            ) : null}
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
