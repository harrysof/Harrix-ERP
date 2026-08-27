import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { InventoryTypeConfig } from "../../lib/types";

interface AddItemModalProps {
  inventoryType: InventoryTypeConfig;
  onClose: () => void;
  onSubmit: (input: { name: string; reference: string; unit: string; reorderThreshold: number }) => void;
}

export function AddItemModal({ inventoryType, onClose, onSubmit }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [unit, setUnit] = useState(inventoryType.defaultUnit);
  const [threshold, setThreshold] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim() || !reference.trim()) {
      setError("Le nom et la référence sont obligatoires.");
      return;
    }
    const thresholdValue = Number(threshold);
    if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
      setError("Le seuil de réapprovisionnement doit être un nombre positif.");
      return;
    }
    onSubmit({ name: name.trim(), reference: reference.trim(), unit: unit.trim() || inventoryType.defaultUnit, reorderThreshold: thresholdValue });
  }

  return (
    <Modal
      title={`Nouvel article — ${inventoryType.label}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Ajouter l'article
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ex. ${inventoryType.singular}`} autoFocus />
        </Field>
        <Field label="Référence">
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. CH-004" />
        </Field>
        <div className="form-row">
          <Field label="Unité">
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </Field>
          <Field label="Seuil de réapprovisionnement" hint="Alerte quand le stock descend à ce niveau ou en dessous">
            <input className="input" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
