import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import type { ApiItem } from "../../lib/stockApi";
import { createOrder, updateOrder, type ApiCustomer, type ApiOrder, type DiscountType } from "../../lib/salesApi";
import { OrderTotalsPanel } from "./OrderTotalsPanel";
import { useI18n } from "../../state/LanguageContext";

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
  const { t } = useI18n();
  const editing = Boolean(order);
  const [customerId, setCustomerId] = useState(order?.customerId ?? customers[0]?.id ?? "");
  const [date, setDate] = useState(order ? order.date.slice(0, 10) : todayIso());
  // Only meaningful at creation — a deposit paid up front (e.g. half now, the
  // rest later). Editing an existing order never touches amountPaid; that
  // goes through "Enregistrer un paiement" on the order detail view instead.
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

  const taxRate = (Number(taxPercent) || 0) / 100;
  // discount is typed as DZD in FIXED mode, or a whole percentage (e.g. "10") in
  // PERCENT mode — converted to the fraction the API wants, exactly like taxRate above.
  const discountInput = Number(discount) || 0;
  const discountValue = discountType === "PERCENT" ? discountInput / 100 : discountInput;
  const extras = { shipping: Number(shipping) || 0, discount: discountValue, discountType, taxRate };
  const activeLines = lines.filter((l) => l.itemId && l.quantity > 0);

  // Mirrors the server's arithmetic so the user sees the total while typing.
  // The saved figures always come back from the API.
  const subtotal = round(activeLines.reduce((sum, l) => sum + Math.max(0, l.quantity * l.unitPrice - l.discount), 0));
  const lineDiscounts = round(activeLines.reduce((sum, l) => sum + l.discount, 0));
  const discountRate = discountType === "PERCENT" ? discountValue : 0;
  const orderDiscount = discountType === "PERCENT" ? round(subtotal * discountRate) : discountValue;
  const taxableBase = subtotal + extras.shipping - orderDiscount;
  const tax = round(taxableBase * taxRate);
  const totals = {
    subtotal,
    lineDiscounts,
    shipping: extras.shipping,
    discount: orderDiscount,
    discountType,
    discountRate,
    taxRate,
    tax,
    total: round(Math.max(0, taxableBase + tax)),
  };

  function updateLine(index: number, patch: Partial<OrderLineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    if (!customerId) return setError(t("order.err.customer"));
    if (activeLines.length === 0) return setError(t("order.err.products"));

    const deposit = Number(amountPaid) || 0;
    if (!editing && deposit > totals.total) {
      return setError(
        t("order.err.deposit", { paid: formatCurrency(deposit), total: formatCurrency(totals.total) }),
      );
    }

    setSaving(true);
    try {
      const payload = {
        customerId,
        date,
        ...(!editing && deposit > 0 ? { amountPaid: deposit } : {}),
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
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? t("order.editTitle", { code: order!.code }) : t("order.newTitle")}
      onClose={onClose}
      width={900}
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
          <Field label={t("field.customer")} hint={customers.length === 0 ? t("order.customerFirstHint") : undefined}>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t("order.choose")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                  {c.email ? ` · ${c.email}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("field.date")}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {!editing ? (
            <Field label={t("order.deposit")} hint={t("order.depositHint")}>
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
            {t("order.products")}
          </p>
          {lines.map((line, i) => (
            <div className="order-line" key={i}>
              <Field label={t("order.product")}>
                <select
                  className="input"
                  value={line.itemId}
                  onChange={(e) => {
                    const item = products.find((p) => p.id === e.target.value);
                    updateLine(i, { itemId: e.target.value, itemName: item?.name ?? "", unit: item?.unit ?? "" });
                  }}
                >
                  <option value="">{t("order.choose")}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t("order.productInStock", {
                        name: p.name,
                        quantity: formatQuantity(p.quantity, p.unit),
                      })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={line.unit ? t("order.qtyWithUnit", { unit: line.unit }) : t("order.qty")}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity || ""}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("field.unitPrice")}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitPrice || ""}
                  onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("order.lineDiscountLabel")}>
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
              <Button variant="ghost" onClick={() => setLines((prev) => prev.filter((_, xi) => xi !== i))} aria-label={t("action.remove")}>
                ✕
              </Button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((prev) => [...prev, emptyLine()])} style={{ marginTop: 8 }}>
            {t("order.addProduct")}
          </Button>
        </div>

        <div className="form-row">
          <Field label={t("order.shippingLabel")}>
            <input className="input" type="number" min={0} step="any" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </Field>
          <Field
            label={t("order.globalDiscount")}
            hint={discountType === "PERCENT" ? t("order.rateOnlyHint") : undefined}
          >
            <div className="field-inline-group">
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={discountType === "PERCENT" ? t("order.ph.discountPercent") : ""}
              />
              <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                <option value="FIXED">DZD</option>
                <option value="PERCENT">%</option>
              </select>
            </div>
          </Field>
          <Field label={t("order.taxLabel")} hint={t("order.rateOnlyHint")}>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder={t("order.ph.taxPercent")}
            />
          </Field>
        </div>

        <OrderTotalsPanel totals={totals} />

        <Field label={t("field.notes")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Banner tone="info">
          {t("order.savingMovesNothing")}
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
