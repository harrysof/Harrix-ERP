import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import type { ApiItem, ApiBatch } from "../../lib/stockApi";
import { fetchBatches } from "../../lib/stockApi";
import { formatCurrency, formatQuantity } from "../../lib/format";
import type { MaterialLine } from "./types";
import { useI18n } from "../../state/LanguageContext";

interface MaterialLineEditorProps {
  materialItems: ApiItem[];
  line: MaterialLine;
  onChange: (line: MaterialLine) => void;
  onRemove: () => void;
}

export function MaterialLineEditor({ materialItems, line, onChange, onRemove }: MaterialLineEditorProps) {
  const { t } = useI18n();
  const selectedItem = materialItems.find((i) => i.id === line.itemId);
  const needsBatch = Boolean(selectedItem?.inventoryType.hasBatches);
  const [batches, setBatches] = useState<ApiBatch[]>([]);

  useEffect(() => {
    if (!line.itemId || !needsBatch) {
      setBatches([]);
      return;
    }
    fetchBatches(line.itemId).then((all) => setBatches(all.filter((b) => b.remaining > 0)));
  }, [line.itemId, needsBatch]);

  // Keep the line's cost in step with the lot chosen: a lot-tracked material
  // is priced by the lot it is actually drawn from, not by the article's
  // overall average, so switching lots can genuinely change what the batch
  // costs. This is the same rule the backend applies when it writes the batch.
  useEffect(() => {
    const nextCost = needsBatch
      ? (batches.find((b) => b.id === line.stockBatchId)?.unitCost ?? selectedItem?.averageUnitCost ?? null)
      : (selectedItem?.averageUnitCost ?? null);
    if (nextCost !== line.unitCost) onChange({ ...line, unitCost: nextCost });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, line.stockBatchId, line.itemId]);

  // Preselect the FEFO/FIFO lot — the recommended one to draw from. It stays a
  // recommendation, not a rule: the backend accepts any lot with stock in it,
  // because a factory sometimes has a real reason to break the order.
  useEffect(() => {
    if (needsBatch && batches.length > 0 && !line.stockBatchId) {
      onChange({ ...line, stockBatchId: batches[0].id, batchNumber: batches[0].batchNumber });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  return (
    <div className="material-line">
      <Field label={t("prod.material")}>
        <select
          className="input"
          value={line.itemId}
          onChange={(e) => {
            const item = materialItems.find((i) => i.id === e.target.value);
            onChange({
              itemId: e.target.value,
              itemName: item?.name ?? "",
              unit: item?.unit ?? "",
              quantity: line.quantity,
              stockBatchId: null,
              batchNumber: null,
              unitCost: item?.averageUnitCost ?? null,
            });
          }}
        >
          <option value="">{t("prod.choose")}</option>
          {materialItems.map((item) => (
            <option key={item.id} value={item.id}>
              {t("prod.materialAvailable", {
                name: item.name,
                quantity: formatQuantity(item.quantity, item.unit),
              })}
            </option>
          ))}
        </select>
      </Field>

      {needsBatch ? (
        <Field label={t("prod.lotFefo")} hint={t("prod.lotFefoHint")}>
          <select
            className="input"
            value={line.stockBatchId ?? ""}
            onChange={(e) => {
              const batch = batches.find((b) => b.id === e.target.value);
              onChange({ ...line, stockBatchId: e.target.value, batchNumber: batch?.batchNumber ?? null });
            }}
          >
            {batches.length === 0 ? <option value="">{t("prod.noLot")}</option> : null}
            {batches.map((b, i) => (
              <option key={b.id} value={b.id}>
                {t("prod.lotRemaining", {
                  batch: b.batchNumber,
                  remaining: formatQuantity(b.remaining, selectedItem?.unit ?? ""),
                })}
                {b.unitCost != null ? ` · ${formatCurrency(b.unitCost)}/${selectedItem?.unit ?? "u"}` : ""}
                {i === 0 ? t("prod.lotRecommended") : ""}
                {b.status === "expired"
                  ? t("prod.lotExpired")
                  : b.status === "warning"
                    ? t("prod.lotExpiringSoon")
                    : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label={selectedItem ? t("prod.quantityWithUnit", { unit: selectedItem.unit }) : t("prod.quantity")}>
        <input
          className="input"
          type="number"
          min={0}
          step="any"
          value={line.quantity || ""}
          onChange={(e) => onChange({ ...line, quantity: Number(e.target.value) })}
        />
      </Field>

      {/* The price comes from the stock itself, so it is shown rather than
          typed: a material's cost is decided when it is bought, not when it
          is consumed. */}
      <Field
        label={t("field.unitCost")}
        hint={t(line.itemId && line.unitCost === null ? "prod.unitCostUnknown" : "prod.unitCostFromStock")}
      >
        <input
          className="input"
          value={line.unitCost != null ? formatCurrency(line.unitCost) : "—"}
          readOnly
          tabIndex={-1}
          aria-label={t("prod.unitCostAria")}
        />
      </Field>

      <Field label={t("prod.lineCost")}>
        <input
          className="input"
          value={line.unitCost != null && line.quantity > 0 ? formatCurrency(line.unitCost * line.quantity) : "—"}
          readOnly
          tabIndex={-1}
          aria-label={t("prod.lineCostAria")}
        />
      </Field>

      <Button variant="ghost" onClick={onRemove} aria-label={t("prod.removeMaterial")}>
        ✕
      </Button>
    </div>
  );
}
