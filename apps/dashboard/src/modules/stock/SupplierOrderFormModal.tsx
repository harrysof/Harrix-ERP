import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { todayIso } from "../../lib/date";
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
}

export function SupplierOrderFormModal({ suppliers, items, onClose, onSubmit }: SupplierOrderFormModalProps) {
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ id: 1, itemId: "", quantity: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(id: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((current) => [...current, { id: Date.now(), itemId: "", quantity: "" }]);
  }

  function removeLine(id: number) {
    setLines((current) => (current.length > 1 ? current.filter((l) => l.id !== id) : current));
  }

  async function handleSubmit() {
    if (!supplierId) {
      setError("Le fournisseur est obligatoire.");
      return;
    }
    if (!orderDate) {
      setError("La date de commande est obligatoire.");
      return;
    }
    const parsed = lines
      .filter((l) => l.itemId && Number(l.quantity) > 0)
      .map((l) => ({ itemId: l.itemId, quantityOrdered: Number(l.quantity) }));
    if (parsed.length === 0) {
      setError("Ajoutez au moins une ligne avec une quantité supérieure à zéro.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ supplierId, orderDate, notes: notes.trim() || undefined, lines: parsed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Nouvelle commande fournisseur"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer la commande"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label="Fournisseur">
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Choisir —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de commande">
            <input className="input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes" hint="Facultatif — ex. délai, numéro de bon de commande">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="order-lines-editor">
          <p className="order-lines-title">Lignes de commande</p>
          {lines.map((line) => (
            <div key={line.id} className="order-line-editor">
              <select
                className="input"
                value={line.itemId}
                onChange={(e) => updateLine(line.id, { itemId: e.target.value })}
              >
                <option value="">— Choisir un article —</option>
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
                placeholder="Qté"
                value={line.quantity}
                onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
              />
              <Button variant="ghost" onClick={() => removeLine(line.id)}>
                Suppr.
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={addLine}>
            + Ajouter une ligne
          </Button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}