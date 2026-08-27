import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { Item } from "../../lib/types";
import { getInventoryType } from "../../lib/stockConfig";
import { todayIso } from "../../lib/stockEngine";

interface ReceiveStockModalProps {
  item: Item;
  onClose: () => void;
  onSubmit: (input: { quantity: number; date: string; supplierName: string | null; batchNumber?: string; expiryDate?: string | null }) => void;
}

export function ReceiveStockModal({ item, onClose, onSubmit }: ReceiveStockModalProps) {
  const type = getInventoryType(item.inventoryTypeId);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayIso());
  const [supplierName, setSupplierName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError("La quantité doit être un nombre supérieur à zéro.");
      return;
    }
    if (!date) {
      setError("La date est obligatoire.");
      return;
    }
    if (type.hasBatches && !batchNumber.trim()) {
      setError("Le numéro de lot est obligatoire pour ce type de produit.");
      return;
    }
    if (type.hasExpiry && !expiryDate) {
      setError("La date de péremption est obligatoire pour ce type de produit.");
      return;
    }
    onSubmit({
      quantity: quantityValue,
      date,
      supplierName: supplierName.trim() || null,
      batchNumber: type.hasBatches ? batchNumber.trim() : undefined,
      expiryDate: type.hasExpiry ? expiryDate : undefined,
    });
  }

  return (
    <Modal
      title={`Réception — ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Enregistrer la réception
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={`Quantité reçue (${item.unit})`}>
            <input className="input" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </Field>
          <Field label="Date de réception">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Fournisseur" hint="Le module Fournisseurs arrive bientôt — pour l'instant, un nom libre suffit">
          <input className="input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Ex. Sodichim" />
        </Field>

        {type.hasBatches ? (
          <div className="form-row">
            <Field label="Numéro de lot">
              <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Ex. L-2501" />
            </Field>
            {type.hasExpiry ? (
              <Field label="Date de péremption">
                <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
