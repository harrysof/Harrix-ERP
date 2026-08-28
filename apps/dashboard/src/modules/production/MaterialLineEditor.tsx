import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import type { ApiItem, ApiBatch } from "../../lib/stockApi";
import { fetchBatches } from "../../lib/stockApi";
import { formatQuantity } from "../../lib/format";
import type { MaterialLine } from "./types";

interface MaterialLineEditorProps {
  materialItems: ApiItem[];
  line: MaterialLine;
  onChange: (line: MaterialLine) => void;
  onRemove: () => void;
}

export function MaterialLineEditor({ materialItems, line, onChange, onRemove }: MaterialLineEditorProps) {
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
      <Field label="Matière">
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
            });
          }}
        >
          <option value="">— Choisir —</option>
          {materialItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({formatQuantity(item.quantity, item.unit)} disponible)
            </option>
          ))}
        </select>
      </Field>

      {needsBatch ? (
        <Field label="Lot (FEFO recommandé)">
          <select
            className="input"
            value={line.stockBatchId ?? ""}
            onChange={(e) => {
              const batch = batches.find((b) => b.id === e.target.value);
              onChange({ ...line, stockBatchId: e.target.value, batchNumber: batch?.batchNumber ?? null });
            }}
          >
            {batches.length === 0 ? <option value="">Aucun lot disponible</option> : null}
            {batches.map((b, i) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} · {formatQuantity(b.remaining, selectedItem?.unit ?? "")} restant
                {i === 0 ? " (recommandé)" : ""}
                {b.status === "expired" ? " · périmé" : b.status === "warning" ? " · bientôt périmé" : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label={`Quantité${selectedItem ? ` (${selectedItem.unit})` : ""}`}>
        <input
          className="input"
          type="number"
          min={0}
          step="any"
          value={line.quantity || ""}
          onChange={(e) => onChange({ ...line, quantity: Number(e.target.value) })}
        />
      </Field>

      <Button variant="ghost" onClick={onRemove} aria-label="Retirer cette matière">
        ✕
      </Button>
    </div>
  );
}
