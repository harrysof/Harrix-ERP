import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { InventoryTypeConfig } from "../../lib/types";
import type { Supplier } from "../../lib/suppliersApi";
import { todayIso } from "../../lib/date";
import { formatCurrency } from "../../lib/format";

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
      setError("La quantité doit être un nombre supérieur à zéro.");
      return;
    }
    if (!date) {
      setError("La date est obligatoire.");
      return;
    }
    if (inventoryType.hasBatches && !batchNumber.trim()) {
      setError("Le numéro de lot est obligatoire pour ce type de produit.");
      return;
    }
    if (inventoryType.hasExpiry && !expiryDate) {
      setError("La date de péremption est obligatoire pour ce type de produit.");
      return;
    }
    if (unitCost !== "" && (!Number.isFinite(unitCostValue!) || unitCostValue! < 0)) {
      setError("Le coût unitaire doit être un nombre positif (DZD).");
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
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Réception — ${itemName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer la réception"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={`Quantité reçue (${itemUnit})`}>
            <input className="input" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </Field>
          <Field label="Date de réception">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field
          label={`Coût unitaire (DZD / ${itemUnit})`}
          hint={
            itemUnitCost != null
              ? "Pré-rempli avec le coût standard de l'article. Corrigez-le si cette livraison a été payée à un autre prix — c'est ce montant qui entre dans la valeur du stock."
              : "Ce que cette livraison coûte par unité. Laissez vide si le prix n'est pas connu — l'entrée restera visiblement non valorisée."
          }
        >
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="Ex. 1200"
          />
          {lineTotal !== null ? <span className="field-hint">Valeur de la réception : {formatCurrency(lineTotal)}</span> : null}
        </Field>

        <Field label="Fournisseur" hint={suppliers.length === 0 ? "Aucun fournisseur enregistré — ajoutez-en un dans l'onglet Fournisseurs" : undefined}>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Non précisé —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {inventoryType.hasBatches ? (
          <div className="form-row">
            <Field label="Numéro de lot">
              <input className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Ex. L-2501" />
            </Field>
            {inventoryType.hasExpiry ? (
              <Field label="Date de péremption">
                <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
            ) : null}
          </div>
        ) : null}

        {inventoryType.hasQuality ? (
          <Field label="Classe de qualité" hint="Comment ces unités sont classées à leur sortie de production">
            <select className="input" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">— Non classé —</option>
              <option value="1er">1er choix</option>
              <option value="2ème">2ème choix</option>
              <option value="rebut">Rebut</option>
            </select>
          </Field>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
