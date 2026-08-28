import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import type { InventoryTypeConfig } from "../../lib/types";
import type { ApiBatch } from "../../lib/stockApi";
import { fetchBatches } from "../../lib/stockApi";
import { formatDate, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import { ApiError } from "../../lib/api";

const REASONS = ["Vente", "Production", "Maintenance", "Casse", "Périmé", "Ajustement d'inventaire", "Autre"];

interface LogUsageModalProps {
  itemId: string;
  itemName: string;
  itemUnit: string;
  itemQuantity: number;
  itemMachine: string;
  inventoryType: InventoryTypeConfig;
  onClose: () => void;
  onSubmit: (input: {
    batchId: string | null;
    quantity: number;
    date: string;
    reason: string;
    machine?: string | null;
    maintenanceRef?: string | null;
    employee?: string | null;
    notes?: string | null;
    quality?: string | null;
  }) => Promise<void> | void;
}

export function LogUsageModal({ itemId, itemName, itemUnit, itemQuantity, itemMachine, inventoryType, onClose, onSubmit }: LogUsageModalProps) {
  const [batches, setBatches] = useState<ApiBatch[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!inventoryType.hasBatches) return;
    fetchBatches(itemId)
      .then((all) => setBatches(all.filter((b) => b.remaining > 0)))
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Impossible de charger les lots."));
  }, [itemId, inventoryType.hasBatches]);

  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState(inventoryType.hasMachineInfo ? "Maintenance" : inventoryType.hasQuality ? "Vente" : REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [machine, setMachine] = useState(itemMachine);
  const [maintenanceRef, setMaintenanceRef] = useState("");
  const [employee, setEmployee] = useState("");
  const [notes, setNotes] = useState("");
  const [quality, setQuality] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (batches && batches.length > 0 && !batchId) setBatchId(batches[0].id);
  }, [batches, batchId]);

  const selectedBatch = batches?.find((b) => b.id === batchId) ?? null;
  const cap = inventoryType.hasBatches ? (selectedBatch?.remaining ?? 0) : itemQuantity;

  async function handleSubmit() {
    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError("La quantité doit être un nombre supérieur à zéro.");
      return;
    }
    if (inventoryType.hasBatches && !selectedBatch) {
      setError("Choisissez un lot.");
      return;
    }
    if (quantityValue > cap) {
      setError(`Il n'y a que ${formatQuantity(cap, itemUnit)} disponible${inventoryType.hasBatches ? " dans ce lot" : ""}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    const finalReason = reason === "Autre" ? customReason.trim() || "Autre" : reason;
    try {
      await onSubmit({
        batchId: inventoryType.hasBatches ? batchId : null,
        quantity: quantityValue,
        date,
        reason: finalReason,
        machine: inventoryType.hasMachineInfo ? machine.trim() || null : null,
        maintenanceRef: inventoryType.hasMachineInfo ? maintenanceRef.trim() || null : null,
        employee: inventoryType.hasMachineInfo ? employee.trim() || null : null,
        notes: inventoryType.hasMachineInfo ? notes.trim() || null : null,
        quality: inventoryType.hasQuality ? quality || null : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Modal title={`Sortie — ${itemName}`} onClose={onClose} footer={<Button onClick={onClose}>Fermer</Button>}>
        <p className="form-error">{loadError}</p>
      </Modal>
    );
  }

  if (inventoryType.hasBatches && batches === null) {
    return (
      <Modal title={`Sortie — ${itemName}`} onClose={onClose}>
        <p className="loading-text">Chargement des lots…</p>
      </Modal>
    );
  }

  if (inventoryType.hasBatches && batches?.length === 0) {
    return (
      <Modal title={`Sortie — ${itemName}`} onClose={onClose} footer={<Button onClick={onClose}>Fermer</Button>}>
        <p className="form-error">Aucun lot disponible pour cet article — il n'y a rien à sortir.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Sortie — ${itemName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer la sortie"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {inventoryType.hasBatches ? (
          <Field label="Lot à utiliser" hint="Priorité au lot qui expire le plus tôt (FEFO) ; à défaut, le plus ancien (FIFO)">
            <select className="input" value={batchId ?? ""} onChange={(e) => setBatchId(e.target.value)}>
              {batches!.map((b, i) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — reçu le {formatDate(b.receivedDate)} · {formatQuantity(b.remaining, itemUnit)} restant
                  {i === 0 ? " (prioritaire)" : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="field-hint" style={{ margin: 0 }}>
            Disponible : {formatQuantity(itemQuantity, itemUnit)}
          </p>
        )}

        {selectedBatch?.status === "expired" ? <Pill tone="danger">Ce lot est périmé</Pill> : null}
        {selectedBatch?.status === "warning" ? <Pill tone="warn">Ce lot expire bientôt</Pill> : null}

        <div className="form-row">
          <Field label={`Quantité utilisée (${itemUnit})`}>
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

        {inventoryType.hasQuality ? (
          <Field label="Classe de qualité" hint="Si ces sorties concernent une classe précise (1er choix, 2ème choix, rebut)">
            <select className="input" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">— Non classé —</option>
              <option value="1er">1er choix</option>
              <option value="2ème">2ème choix</option>
              <option value="rebut">Rebut</option>
            </select>
          </Field>
        ) : null}

        {inventoryType.hasMachineInfo ? (
          <>
            <p className="detail-type" style={{ margin: 0 }}>
              Détails maintenance
            </p>
            <Field label="Machine">
              <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="Machine concernée" />
            </Field>
            <div className="form-row">
              <Field label="Référence maintenance" hint="Ex. MT-2026-021">
                <input className="input" value={maintenanceRef} onChange={(e) => setMaintenanceRef(e.target.value)} />
              </Field>
              <Field label="Employé / intervenant">
                <input className="input" value={employee} onChange={(e) => setEmployee(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Panne constatée, pièce remplacée…" />
            </Field>
          </>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
