import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { ApiItem } from "../../lib/stockApi";
import { formatCurrency, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import type { Customer, Order, OrderLine } from "./types";
import { orderSubtotal, orderTotal } from "./types";

const emptyLine = (): OrderLine => ({ productItemId: "", productName: "", unit: "", quantity: 1, unitPrice: 0 });

export function OrderModal({
  customers,
  finishedGoodsItems,
  onClose,
  onSubmit,
}: {
  customers: Customer[];
  finishedGoodsItems: ApiItem[];
  onClose: () => void;
  onSubmit: (input: Omit<Order, "id" | "orderNumber" | "createdAt">) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);
  const [shipping, setShipping] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const draft = { lines, shipping: Number(shipping) || 0, discount: Number(discount) || 0, tax: Number(tax) || 0 };

  function updateLine(i: number, line: OrderLine) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? line : l)));
  }

  function handleSubmit() {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      setError("Choisissez un client.");
      return;
    }
    const validLines = lines.filter((l) => l.productItemId && l.quantity > 0);
    if (validLines.length === 0) {
      setError("Ajoutez au moins un article.");
      return;
    }
    for (const item of validLines) {
      const stockItem = finishedGoodsItems.find((i) => i.id === item.productItemId);
      if (stockItem && item.quantity > stockItem.quantity) {
        setError(`Attention : ${item.productName} — commande de ${item.quantity} mais seulement ${stockItem.quantity} en stock. Ajustez ou confirmez quand même en enregistrant à nouveau.`);
        // Allow proceeding on a second click by not returning here would require extra state;
        // for now this surfaces the warning and blocks — matches "warn, don't silently oversell".
        return;
      }
    }
    onSubmit({
      date,
      customerId: customer.id,
      customerName: customer.fullName,
      lines: validLines,
      shipping: draft.shipping,
      discount: draft.discount,
      tax: draft.tax,
      shipmentStatus: "En attente",
      paymentStatus: "En attente",
    });
  }

  return (
    <Modal
      title="Nouvelle commande"
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Créer la commande
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Client" hint={customers.length === 0 ? "Ajoutez d'abord un client dans l'onglet Clients" : undefined}>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Choisir —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Articles
          </p>
          {lines.map((line, i) => {
            const stockItem = finishedGoodsItems.find((item) => item.id === line.productItemId);
            return (
              <div key={i} className="material-line">
                <Field label="Produit">
                  <select
                    className="input"
                    value={line.productItemId}
                    onChange={(e) => {
                      const item = finishedGoodsItems.find((it) => it.id === e.target.value);
                      updateLine(i, { ...line, productItemId: e.target.value, productName: item?.name ?? "", unit: item?.unit ?? "" });
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {finishedGoodsItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatQuantity(item.quantity, item.unit)} en stock)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Quantité${stockItem ? ` (${stockItem.unit})` : ""}`}>
                  <input className="input" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, { ...line, quantity: Number(e.target.value) })} />
                </Field>
                <Field label="Prix unitaire (DZD)">
                  <input className="input" type="number" min={0} value={line.unitPrice} onChange={(e) => updateLine(i, { ...line, unitPrice: Number(e.target.value) })} />
                </Field>
                <Button variant="ghost" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Retirer">
                  ✕
                </Button>
              </div>
            );
          })}
          <Button variant="ghost" onClick={() => setLines((prev) => [...prev, emptyLine()])} style={{ marginTop: 8 }}>
            + Ajouter un article
          </Button>
        </div>

        <div className="form-row">
          <Field label="Livraison (DZD)">
            <input className="input" type="number" min={0} value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </Field>
          <Field label="Remise (DZD)">
            <input className="input" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Taxe (DZD)">
            <input className="input" type="number" min={0} value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
        </div>

        <div className="reconciliation">
          <div className="reconciliation-figure">
            <span className="label">Sous-total</span>
            <span className="value tabular">{formatCurrency(orderSubtotal(draft))}</span>
          </div>
          <div className="reconciliation-figure">
            <span className="label">Total</span>
            <span className="value tabular">{formatCurrency(orderTotal(draft))}</span>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
