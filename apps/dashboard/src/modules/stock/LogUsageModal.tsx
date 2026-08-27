import { useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import type { Item } from "../../lib/types";
import { getInventoryType } from "../../lib/stockConfig";
import { getBatchesWithRemaining, getItemQuantity, todayIso } from "../../lib/stockEngine";
import { useStock } from "../../state/StockContext";
import { formatDate, formatQuantity } from "../../lib/format";

const REASONS = ["Production", "Maintenance", "Casse", "Périmé", "Ajustement d'inventaire", "Autre"];

interface LogUsageModalProps {
  item: Item;
  onClose: () => void;
  onSubmit: (input: { batchId: string | null; quantity: number; date: string; reason: string }) => void;
}

export function LogUsageModal({ item, onClose, onSubmit }: LogUsageModalProps) {
  const { movements, batches } = useStock();
  const type = getInventoryType(item.inventoryTypeId);
  const today = todayIso();

  const fifoBatches = useMemo(
    () => getBatchesWithRemaining(batches, movements, item.id, today).filter((b) => b.remaining > 0),
    [batches, movements, item.id, today],
  );

  const availableQuantity = getItemQuantity(movements, item.id);

  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [batchId, setBatchId] = useState<string | null>(fifoBatches[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const selectedBatch = fifoBatches.find((b) => b.id === batchId) ?? null;
  const cap = type.hasBatches ? (selectedBatch?.remaining ?? 0) : availableQuantity;

  function handleSubmit() {
    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError("La quantité doit être un nombre supérieur à zéro.");
      return;
    }
    if (type.hasBatches && !selectedBatch) {
      setError("Choisissez un lot.");
      return;
    }
    if (quantityValue > cap) {
      setError(`Il n'y a que ${formatQuantity(cap, item.unit)} disponible${type.hasBatches ? " dans ce lot" : ""}.`);
      return;
    }
    const finalReason = reason === "Autre" ? customReason.trim() || "Autre" : reason;
    onSubmit({ batchId: type.hasBatches ? batchId : null, quantity: quantityValue, date, reason: finalReason });
  }

  if (type.hasBatches && fifoBatches.length === 0) {
    return (
      <Modal title={`Sortie — ${item.name}`} onClose={onClose} footer={<Button onClick={onClose}>Fermer</Button>}>
        <p className="form-error">Aucun lot disponible pour cet article — il n'y a rien à sortir.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Sortie — ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Enregistrer la sortie
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {type.hasBatches ? (
          <Field label="Lot à utiliser" hint="Le plus ancien est proposé en premier (FIFO)">
            <select className="input" value={batchId ?? ""} onChange={(e) => setBatchId(e.target.value)}>
              {fifoBatches.map((b, i) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — reçu le {formatDate(b.receivedDate)} · {formatQuantity(b.remaining, item.unit)} restant
                  {i === 0 ? " (le plus ancien)" : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="field-hint" style={{ margin: 0 }}>
            Disponible : {formatQuantity(availableQuantity, item.unit)}
          </p>
        )}

        {selectedBatch?.status === "expired" ? <Pill tone="danger">Ce lot est périmé</Pill> : null}
        {selectedBatch?.status === "warning" ? <Pill tone="warn">Ce lot expire bientôt</Pill> : null}

        <div className="form-row">
          <Field label={`Quantité utilisée (${item.unit})`}>
            <input className="input" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Raison">
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        {reason === "Autre" ? (
          <Field label="Préciser">
            <input className="input" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
          </Field>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
