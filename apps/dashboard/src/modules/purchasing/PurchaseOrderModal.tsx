import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { todayIso } from "../../lib/date";
import type { ApiItem } from "../../lib/stockApi";
import type { Supplier } from "../../lib/suppliersApi";
import { createPurchaseOrder, updatePurchaseOrder, type ApiPurchaseOrder } from "../../lib/purchasingApi";
import { draftTotals, emptyPoLine, toLineInput, type PoLineDraft } from "./types";

interface PurchaseOrderModalProps {
  suppliers: Supplier[];
  items: ApiItem[];
  /** Present when editing an existing draft. */
  order?: ApiPurchaseOrder;
  onClose: () => void;
  onSaved: () => void;
}

/** §14: create or edit a purchase order. Totals update live as you type. */
export function PurchaseOrderModal({ suppliers, items, order, onClose, onSaved }: PurchaseOrderModalProps) {
  const editing = Boolean(order);
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? suppliers[0]?.id ?? "");
  const [date, setDate] = useState(order ? order.date.slice(0, 10) : todayIso());
  const [expectedDate, setExpectedDate] = useState(order?.expectedDate?.slice(0, 10) ?? "");
  const [shipping, setShipping] = useState(String(order?.shipping ?? ""));
  const [discount, setDiscount] = useState(String(order?.discount ?? ""));
  // Held as a percentage (e.g. "19") — the fraction the API wants is derived below.
  const [taxPercent, setTaxPercent] = useState(order ? String(order.taxRate * 100) : "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [lines, setLines] = useState<PoLineDraft[]>(
    order
      ? order.lines.map((l) => ({ itemId: l.itemId, itemName: l.item.name, unit: l.item.unit, quantity: l.quantity, unitCost: l.unitCost }))
      : [emptyPoLine()],
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const taxRate = (Number(taxPercent) || 0) / 100;
  const extras = { shipping: Number(shipping) || 0, discount: Number(discount) || 0, taxRate };
  const activeLines = lines.filter((l) => l.itemId && l.quantity > 0);
  const totals = draftTotals(activeLines, extras);

  function updateLine(index: number, patch: Partial<PoLineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    if (!supplierId) return setError("Choisissez un fournisseur.");
    if (activeLines.length === 0) return setError("Ajoutez au moins une ligne avec une quantité.");
    for (const line of lines) {
      if (line.itemId && line.quantity <= 0) return setError(`Indiquez une quantité pour « ${line.itemName} ».`);
    }

    setSaving(true);
    try {
      const payload = {
        supplierId,
        date,
        ...(expectedDate ? { expectedDate } : {}),
        ...extras,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        lines: activeLines.map(toLineInput),
      };
      if (order) await updatePurchaseOrder(order.id, payload);
      else await createPurchaseOrder(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? `Modifier ${order!.code}` : "Nouveau bon de commande"}
      onClose={onClose}
      width={880}
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
          <Field label="Fournisseur">
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Choisir —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Livraison prévue" hint="Facultatif">
            <input className="input" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Articles commandés
          </p>
          {lines.map((line, i) => (
            <div className="material-line" key={i}>
              <Field label="Article">
                <select
                  className="input"
                  value={line.itemId}
                  onChange={(e) => {
                    const item = items.find((it) => it.id === e.target.value);
                    updateLine(i, { itemId: e.target.value, itemName: item?.name ?? "", unit: item?.unit ?? "" });
                  }}
                >
                  <option value="">— Choisir —</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.reference})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Quantité${line.unit ? ` (${line.unit})` : ""}`}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity || ""}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Prix unitaire (DZD)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitCost || ""}
                  onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })}
                />
              </Field>
              <Button variant="ghost" onClick={() => setLines((prev) => prev.filter((_, xi) => xi !== i))} aria-label="Retirer">
                ✕
              </Button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((prev) => [...prev, emptyPoLine()])} style={{ marginTop: 8 }}>
            + Ajouter une ligne
          </Button>
        </div>

        <div className="form-row">
          <Field label="Transport (DZD)">
            <input className="input" type="number" min={0} step="any" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </Field>
          <Field label="Remise (DZD)">
            <input className="input" type="number" min={0} step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Taxe (%)" hint="Le taux seulement — le montant en DZD est calculé automatiquement">
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder="Ex. 19"
            />
          </Field>
        </div>

        <TotalsPanel totals={totals} />

        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Banner tone="info">
          Enregistrer ce bon ne touche pas au stock. Le stock n'augmente qu'à la réception de la marchandise, depuis la fiche du bon.
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

export function TotalsPanel({
  totals,
}: {
  totals: {
    subtotal: number;
    shipping: number;
    discount: number;
    taxRate?: number;
    tax: number;
    total: number;
    lineDiscounts?: number;
  };
}) {
  const taxLabel =
    totals.taxRate != null && totals.taxRate > 0
      ? `Taxe (${(totals.taxRate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %)`
      : "Taxe";
  return (
    <div className="totals-panel">
      <TotalRow label="Sous-total" value={totals.subtotal} />
      {totals.lineDiscounts ? <TotalRow label="dont remises par ligne" value={-totals.lineDiscounts} muted /> : null}
      <TotalRow label="Transport" value={totals.shipping} />
      <TotalRow label="Remise" value={-totals.discount} />
      <TotalRow label={taxLabel} value={totals.tax} />
      <TotalRow label="Total" value={totals.total} strong />
    </div>
  );
}

function TotalRow({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`totals-row ${strong ? "totals-row-strong" : ""} ${muted ? "totals-row-muted" : ""}`.trim()}>
      <span>{label}</span>
      <span className="tabular">{formatCurrency(value)}</span>
    </div>
  );
}
