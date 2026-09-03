import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { FilePicker } from "../../components/ui/FilePicker";
import { useI18n } from "../../state/LanguageContext";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatPercent } from "../../lib/format";
import { todayIso } from "../../lib/date";
import type { ApiItem } from "../../lib/stockApi";
import type { Supplier } from "../../lib/suppliersApi";
import { createPurchaseOrder, updatePurchaseOrder, type ApiPurchaseOrder, type DiscountType } from "../../lib/purchasingApi";
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
  const { t } = useI18n();
  const editing = Boolean(order);
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? suppliers[0]?.id ?? "");
  const [date, setDate] = useState(order ? order.date.slice(0, 10) : todayIso());
  const [expectedDate, setExpectedDate] = useState(order?.expectedDate?.slice(0, 10) ?? "");
  // Only meaningful at creation — a deposit paid to the supplier up front.
  // Editing an existing order never touches amountPaid; that goes through
  // "Enregistrer un paiement" on the order detail view instead.
  const [amountPaid, setAmountPaid] = useState("");
  const [shipping, setShipping] = useState(String(order?.shipping ?? ""));
  const [discountType, setDiscountType] = useState<DiscountType>(order?.discountType ?? "FIXED");
  // In FIXED mode this is a DZD amount; in PERCENT mode it's a percentage (e.g. "10") — the fraction the API wants is derived below.
  const [discount, setDiscount] = useState(
    order ? String(order.discountType === "PERCENT" ? order.discount * 100 : order.discount) : "",
  );
  // Held as a percentage (e.g. "19") — the fraction the API wants is derived below.
  const [taxPercent, setTaxPercent] = useState(order ? String(order.taxRate * 100) : "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [invoiceFileName, setInvoiceFileName] = useState(order?.invoiceFileName ?? "");
  const [invoiceFileUrl, setInvoiceFileUrl] = useState(order?.invoiceFileUrl ?? "");
  const [lines, setLines] = useState<PoLineDraft[]>(
    order
      ? order.lines.map((l) => ({ itemId: l.itemId, itemName: l.item.name, unit: l.item.unit, quantity: l.quantity, unitCost: l.unitCost }))
      : [emptyPoLine()],
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const taxRate = (Number(taxPercent) || 0) / 100;
  // discount is typed as DZD in FIXED mode, or a whole percentage (e.g. "10") in
  // PERCENT mode — converted to the fraction the API wants, exactly like taxRate above.
  const discountInput = Number(discount) || 0;
  const discountValue = discountType === "PERCENT" ? discountInput / 100 : discountInput;
  const extras = { shipping: Number(shipping) || 0, discount: discountValue, discountType, taxRate };
  const activeLines = lines.filter((l) => l.itemId && l.quantity > 0);
  const totals = draftTotals(activeLines, extras);

  function updateLine(index: number, patch: Partial<PoLineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    if (!supplierId) return setError(t("po.err.supplier"));
    if (activeLines.length === 0) return setError(t("po.err.lines"));
    for (const line of lines) {
      if (line.itemId && line.quantity <= 0) return setError(t("po.err.lineQuantity", { item: line.itemName }));
    }

    const deposit = Number(amountPaid) || 0;
    if (!editing && deposit > totals.total) {
      return setError(t("po.err.deposit", { paid: formatCurrency(deposit), total: formatCurrency(totals.total) }));
    }

    setSaving(true);
    try {
      const payload = {
        supplierId,
        date,
        ...(expectedDate ? { expectedDate } : {}),
        ...(!editing && deposit > 0 ? { amountPaid: deposit } : {}),
        ...extras,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        // Sent even when empty so clearing a previously attached file (via
        // FilePicker's "Retirer") actually removes it on save.
        invoiceFileName: invoiceFileName,
        invoiceFileUrl: invoiceFileUrl,
        lines: activeLines.map(toLineInput),
      };
      if (order) await updatePurchaseOrder(order.id, payload);
      else await createPurchaseOrder(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? t("po.editTitle", { code: order!.code }) : t("po.newTitle")}
      onClose={onClose}
      width={880}
      footer={
        <>
          <Button onClick={onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t("action.saving") : t("action.save")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={t("field.supplier")}>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{t("po.choose")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("field.date")}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t("po.expectedDelivery")} hint={t("state.optional")}>
            <input className="input" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </Field>
          {!editing ? (
            <Field label={t("po.deposit")} hint={t("po.depositHint")}>
              <input
                className="input"
                type="number"
                min={0}
                max={totals.total || undefined}
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
              />
            </Field>
          ) : null}
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            {t("po.orderedItems")}
          </p>
          {lines.map((line, i) => (
            <div className="material-line" key={i}>
              <Field label={t("field.item")}>
                <select
                  className="input"
                  value={line.itemId}
                  onChange={(e) => {
                    const item = items.find((it) => it.id === e.target.value);
                    updateLine(i, { itemId: e.target.value, itemName: item?.name ?? "", unit: item?.unit ?? "" });
                  }}
                >
                  <option value="">{t("po.choose")}</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t("po.itemWithReference", { name: item.name, reference: item.reference })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={line.unit ? t("po.quantityWithUnit", { unit: line.unit }) : t("po.quantity")}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity || ""}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("po.unitCostLabel")}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitCost || ""}
                  onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })}
                />
              </Field>
              <Button variant="ghost" onClick={() => setLines((prev) => prev.filter((_, xi) => xi !== i))} aria-label={t("action.remove")}>
                ✕
              </Button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((prev) => [...prev, emptyPoLine()])} style={{ marginTop: 8 }}>
            {t("po.addLine")}
          </Button>
        </div>

        <div className="form-row">
          <Field label={t("po.freight")}>
            <input className="input" type="number" min={0} step="any" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </Field>
          <Field
            label={t("totals.discount")}
            hint={discountType === "PERCENT" ? t("po.rateOnlyHint") : undefined}
          >
            <div className="field-inline-group">
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={discountType === "PERCENT" ? t("po.ph.discountPercent") : ""}
              />
              <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                <option value="FIXED">DZD</option>
                <option value="PERCENT">%</option>
              </select>
            </div>
          </Field>
          <Field label={t("po.taxLabel")} hint={t("po.rateOnlyHint")}>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder={t("po.ph.taxPercent")}
            />
          </Field>
        </div>

        <TotalsPanel totals={totals} />

        <Field label={t("field.notes")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Field label={t("po.invoiceLabel")} hint={t("po.invoiceHint")}>
          <FilePicker
            fileName={invoiceFileName || null}
            fileUrl={invoiceFileUrl || null}
            onSelect={(name, url) => {
              setInvoiceFileName(name);
              setInvoiceFileUrl(url);
            }}
            onClear={() => {
              setInvoiceFileName("");
              setInvoiceFileUrl("");
            }}
          />
        </Field>

        <Banner tone="info">
          {t("po.savingMovesNothing")}
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
    discountType?: DiscountType;
    discountRate?: number;
    taxRate?: number;
    tax: number;
    total: number;
    lineDiscounts?: number;
  };
}) {
  const { t } = useI18n();
  const taxLabel =
    totals.taxRate != null && totals.taxRate > 0
      ? t("totals.taxPercent", { rate: formatPercent(totals.taxRate) })
      : t("totals.tax");
  const discountLabel =
    totals.discountType === "PERCENT" && totals.discountRate
      ? t("totals.discountPercent", { rate: formatPercent(totals.discountRate) })
      : t("totals.discount");
  return (
    <div className="totals-panel">
      <TotalRow label={t("totals.subtotal")} value={totals.subtotal} />
      {totals.lineDiscounts ? <TotalRow label={t("totals.lineDiscounts")} value={-totals.lineDiscounts} muted /> : null}
      <TotalRow label={t("po.freightRow")} value={totals.shipping} />
      <TotalRow label={discountLabel} value={-totals.discount} />
      <TotalRow label={taxLabel} value={totals.tax} />
      <TotalRow label={t("totals.total")} value={totals.total} strong />
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
