import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { todayIso } from "../../lib/date";
import { formatCurrency } from "../../lib/format";
import { Banner } from "../../components/ui/Banner";
import { useI18n } from "../../state/LanguageContext";
import type { Supplier } from "../../lib/suppliersApi";
import type { ApiItem } from "../../lib/stockApi";
import type { SupplierOrderInput } from "../../lib/supplierOrdersApi";

interface SupplierOrderFormModalProps {
  suppliers: Supplier[];
  items: ApiItem[];
  onClose: () => void;
  onSubmit: (input: SupplierOrderInput) => Promise<void>;
}

interface LineDraft {
  id: number;
  itemId: string;
  quantity: string;
  /** Agreed price per unit. Pre-filled from the article, editable per order. */
  unitCost: string;
}

export function SupplierOrderFormModal({ suppliers, items, onClose, onSubmit }: SupplierOrderFormModalProps) {
  const { t } = useI18n();
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ id: 1, itemId: "", quantity: "", unitCost: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(id: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((current) => [...current, { id: Date.now(), itemId: "", quantity: "", unitCost: "" }]);
  }

  /**
   * Picking the article proposes its cost. The price is captured HERE, on the
   * order, rather than at delivery: it is what was agreed with the supplier,
   * and it is what the reception will carry into the stock's value.
   */
  function onItemChange(line: LineDraft, itemId: string) {
    const item = items.find((i) => i.id === itemId);
    const proposed = item?.unitCost ?? item?.averageUnitCost ?? null;
    updateLine(line.id, {
      itemId,
      unitCost: line.unitCost === "" && proposed != null ? String(proposed) : line.unitCost,
    });
  }

  const orderTotal = lines.reduce((sum, l) => {
    const quantity = Number(l.quantity);
    const unitCost = Number(l.unitCost);
    if (!l.itemId || !Number.isFinite(quantity) || !Number.isFinite(unitCost)) return sum;
    return sum + quantity * unitCost;
  }, 0);

  function removeLine(id: number) {
    setLines((current) => (current.length > 1 ? current.filter((l) => l.id !== id) : current));
  }

  async function handleSubmit() {
    if (!supplierId) {
      setError(t("so.err.supplier"));
      return;
    }
    if (!orderDate) {
      setError(t("so.err.date"));
      return;
    }
    const parsed = lines
      .filter((l) => l.itemId && Number(l.quantity) > 0)
      .map((l) => {
        const unitCost = Number(l.unitCost);
        return {
          itemId: l.itemId,
          quantityOrdered: Number(l.quantity),
          ...(l.unitCost !== "" && Number.isFinite(unitCost) && unitCost >= 0 ? { unitCost } : {}),
        };
      });
    if (parsed.length === 0) {
      setError(t("so.err.lines"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ supplierId, orderDate, notes: notes.trim() || undefined, lines: parsed });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={t("so.newTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("action.saving") : t("so.save")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={t("field.supplier")}>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{t("so.choose")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("so.orderDate")}>
            <input className="input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </Field>
        </div>

        <Field label={t("field.notes")} hint={t("so.notesHint")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="order-lines-editor">
          <p className="order-lines-title">{t("so.lines")}</p>
          {lines.map((line) => (
            <div key={line.id} className="order-line-editor">
              <select className="input" value={line.itemId} onChange={(e) => onItemChange(line, e.target.value)}>
                <option value="">{t("so.chooseItem")}</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.reference})
                  </option>
                ))}
              </select>
              <input
                className="input order-line-qty"
                type="number"
                min={0}
                step="any"
                placeholder={t("so.qtyShort")}
                value={line.quantity}
                onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
              />
              <input
                className="input order-line-qty"
                type="number"
                min={0}
                step="any"
                placeholder={t("so.priceShort")}
                title={t("so.priceHint")}
                value={line.unitCost}
                onChange={(e) => updateLine(line.id, { unitCost: e.target.value })}
              />
              <Button variant="ghost" onClick={() => removeLine(line.id)}>
                {t("so.removeShort")}
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={addLine}>
            {t("so.addLine")}
          </Button>
          {orderTotal > 0 ? <p className="order-lines-total">{t("so.orderTotal", { value: formatCurrency(orderTotal) })}</p> : null}
        </div>

        <Banner tone="info">
          {t("so.priceFollowsGoods")}
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}