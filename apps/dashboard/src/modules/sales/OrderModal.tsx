import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import type { ApiItem } from "../../lib/stockApi";
import {
  createOrder,
  updateOrder,
  PAYMENT_LABELS,
  PAYMENT_STATUSES,
  type ApiCustomer,
  type ApiOrder,
} from "../../lib/salesApi";
import { OrderTotalsPanel } from "./OrderTotalsPanel";

interface OrderLineDraft {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const emptyLine = (): OrderLineDraft => ({ itemId: "", itemName: "", unit: "", quantity: 0, unitPrice: 0, discount: 0 });

interface OrderModalProps {
  customers: ApiCustomer[];
  products: ApiItem[];
  order?: ApiOrder;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * §16: create or edit an order. The user picks customer, products, quantities,
 * prices, discount, shipping, tax and statuses — and never types a total. The
 * panel below recomputes live, and the server recomputes again on save, so the
 * two can't disagree.
 */
export function OrderModal({ customers, products, order, onClose, onSaved }: OrderModalProps) {
  const editing = Boolean(order);
  const [customerId, setCustomerId] = useState(order?.customerId ?? customers[0]?.id ?? "");
  const [date, setDate] = useState(order ? order.date.slice(0, 10) : todayIso());
  const [paymentStatus, setPaymentStatus] = useState<string>(order?.paymentStatus ?? "PENDING");
  const [shipping, setShipping] = useState(String(order?.shipping ?? ""));
  const [discount, setDiscount] = useState(String(order?.discount ?? ""));
  const [tax, setTax] = useState(String(order?.tax ?? ""));
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [lines, setLines] = useState<OrderLineDraft[]>(
    order
      ? order.lines.map((l) => ({
          itemId: l.itemId,
          itemName: l.item.name,
          unit: l.item.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        }))
      : [emptyLine()],
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const extras = { shipping: Number(shipping) || 0, discount: Number(discount) || 0, tax: Number(tax) || 0 };
  const activeLines = lines.filter((l) => l.itemId && l.quantity > 0);

  // Mirrors the server's arithmetic so the user sees the total while typing.
  // The saved figures always come back from the API.
  const subtotal = round(activeLines.reduce((sum, l) => sum + Math.max(0, l.quantity * l.unitPrice - l.discount), 0));
  const lineDiscounts = round(activeLines.reduce((sum, l) => sum + l.discount, 0));
  const totals = {
    subtotal,
    lineDiscounts,
    ...extras,
    total: round(Math.max(0, subtotal + extras.shipping + extras.tax - extras.discount)),
  };

  function updateLine(index: number, patch: Partial<OrderLineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    if (!customerId) return setError("Choisissez un client.");
    if (activeLines.length === 0) return setError("Ajoutez au moins un produit avec une quantité.");

    setSaving(true);
    try {
      const payload = {
        customerId,
        date,
        paymentStatus,
        ...extras,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        lines: activeLines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          ...(l.discount > 0 ? { discount: l.discount } : {}),
        })),
      };
      if (order) await updateOrder(order.id, payload);
      else await createOrder(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? `Modifier ${order!.code}` : "Nouvelle commande"}
      onClose={onClose}
      width={900}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label="Client" hint={customers.length === 0 ? "Créez d'abord un client" : undefined}>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Choisir —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                  {c.email ? ` · ${c.email}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Paiement">
            <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Produits
          </p>
          {lines.map((line, i) => (
            <div className="order-line" key={i}>
              <Field label="Produit">
                <select
                  className="input"
                  value={line.itemId}
                  onChange={(e) => {
                    const item = products.find((p) => p.id === e.target.value);
                    updateLine(i, { itemId: e.target.value, itemName: item?.name ?? "", unit: item?.unit ?? "" });
                  }}
                >
                  <option value="">— Choisir —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatQuantity(p.quantity, p.unit)} en stock)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Qté${line.unit ? ` (${line.unit})` : ""}`}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity || ""}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Prix unitaire">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitPrice || ""}
                  onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="Remise ligne">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.discount || ""}
                  onChange={(e) => updateLine(i, { discount: Number(e.target.value) })}
                />
              </Field>
              <div className="order-line-total tabular">
                {formatCurrency(Math.max(0, line.quantity * line.unitPrice - line.discount))}
              </div>
              <Button variant="ghost" onClick={() => setLines((prev) => prev.filter((_, xi) => xi !== i))} aria-label="Retirer">
                ✕
              </Button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((prev) => [...prev, emptyLine()])} style={{ marginTop: 8 }}>
            + Ajouter un produit
          </Button>
        </div>

        <div className="form-row">
          <Field label="Livraison (DZD)">
            <input className="input" type="number" min={0} step="any" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </Field>
          <Field label="Remise globale (DZD)">
            <input className="input" type="number" min={0} step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Taxe (DZD)">
            <input className="input" type="number" min={0} step="any" value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
        </div>

        <OrderTotalsPanel totals={totals} />

        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Banner tone="info">
          Enregistrer une commande ne sort rien du stock. Le stock ne diminue qu'à l'expédition, depuis la fiche de la commande.
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
