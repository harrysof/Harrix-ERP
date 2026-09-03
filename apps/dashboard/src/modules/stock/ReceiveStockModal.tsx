import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { InventoryTypeConfig } from "../../lib/types";
import type { Supplier } from "../../lib/suppliersApi";
import { todayIso } from "../../lib/date";
import { formatCurrency } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";

interface ReceiveStockModalProps {
  itemName: string;
  itemUnit: string;
  /** The article's standard cost, proposed as the delivery's price. */
  itemUnitCost: number | null;
  inventoryType: InventoryTypeConfig;
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (input: {
    quantity: number;
    date: string;
    supplierId: string | null;
    batchNumber?: string;
    expiryDate?: string | null;
    quality?: string | null;
    unitCost?: number | null;
  }) => Promise<void> | void;
}

export function ReceiveStockModal({
  itemName,
  itemUnit,
  itemUnitCost,
  inventoryType,
  suppliers,
  onClose,
  onSubmit,
}: ReceiveStockModalProps) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(itemUnitCost != null ? String(itemUnitCost) : "");
  const [date, setDate] = useState(todayIso());
  const [supplierId, setSupplierId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quality, setQuality] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const unitCostValue = unitCost === "" ? null : Number(unitCost);
  const quantityPreview = Number(quantity);
  // What this delivery is worth, shown live: the reason the field is here.
  const lineTotal =
    unitCostValue !== null && Number.isFinite(unitCostValue) && Number.isFinite(quantityPreview) && quantityPreview > 0
      ? unitCostValue * quantityPreview
      : null;

  async function handleSubmit() {
    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError(t("receive.err.quantity"));
      return;
    }
    if (!date) {
      setError(t("receive.err.date"));
      return;
    }
    if (inventoryType.hasBatches && !batchNumber.trim()) {
      setError(t("receive.err.lotRequired"));
      return;
    }
    if (inventoryType.hasExpiry && !expiryDate) {
      setError(t("receive.err.expiryRequired"));
      return;
    }
    if (unitCost !== "" && (!Number.isFinite(unitCostValue!) || unitCostValue! < 0)) {
      setError(t("item.err.unitCost"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        quantity: quantityValue,
        date,
        supplierId: supplierId || null,
        batchNumber: inventoryType.hasBatches ? batchNumber.trim() : undefined,
        expiryDate: inventoryType.hasExpiry ? expiryDate : undefined,
        quality: inventoryType.hasQuality ? quality || null : undefined,
        unitCost: unitCostValue,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={t("receive.modalTitle", { item: itemName })}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("action.saving") : t("receive.title")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={t("receive.quantityLabel", { unit: itemUnit })}>
            <input className="input" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </Field>
          <Field label={t("receive.date")}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field
          label={t("receive.unitCostLabel", { unit: itemUnit })}
          hint={
            itemUnitCost != null
              ? t("receive.unitCostPrefilled")
              : t("receive.unitCostUnknown")
          }
        >
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder={t("item.ph.unitCost")}
          />
          {lineTotal !== null ? <span className="field-hint">{t("receive.lineValue", { value: formatCurrency(lineTotal) })}</span> : null}
        </Field>

        <Field label={t("field.supplier")} hint={suppliers.length === 0 ? t("receive.noSupplier") : undefined}>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">{t("receive.unspecified")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {inventoryType.hasBatches ? (
          <div className="form-row">
            <Field label={t("field.batchNumber")}>
              <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder={t("item.ph.lot")} />
            </Field>
            {inventoryType.hasExpiry ? (
              <Field label={t("field.expiryDate")}>
                <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
            ) : null}
          </div>
        ) : null}

        {inventoryType.hasQuality ? (
          <Field label={t("quality.classLabel")} hint={t("quality.classHint")}>
            <select className="input" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">{t("receive.unclassified")}</option>
              <option value="1er">{t("quality.first")}</option>
              <option value="2ème">{t("quality.second")}</option>
              <option value="rebut">{t("quality.reject")}</option>
            </select>
          </Field>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
