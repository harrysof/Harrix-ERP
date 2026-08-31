import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import {
  COST_BEHAVIOR_LABELS,
  COST_NATURE_LABELS,
  firstDayOf,
  type CostCategory,
  type CostEntry,
  type CostEntryInput,
  type ProductCosting,
} from "../../lib/financeApi";

interface CostEntryModalProps {
  categories: CostCategory[];
  products: ProductCosting[];
  /** The month being viewed — a new charge defaults inside it, not to today. */
  month: string;
  entry?: CostEntry;
  onClose: () => void;
  onSubmit: (input: CostEntryInput) => Promise<void>;
}

/**
 * One charge, recorded against a category and a date.
 *
 * The product picker only appears for a DIRECT category, because attributing
 * an indirect cost to one product is a contradiction — an indirect cost is by
 * definition one you cannot trace. Leaving it blank on a direct cost is
 * allowed but not free: the charge then joins the pool and the Prix view says
 * so, which is the nudge to come back and attribute it.
 */
export function CostEntryModal({ categories, products, month, entry, onClose, onSubmit }: CostEntryModalProps) {
  // The materials category is computed from production and has no input form.
  const selectable = categories.filter((c) => !c.isMaterials);

  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? selectable[0]?.id ?? "");
  const [label, setLabel] = useState(entry?.label ?? "");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [date, setDate] = useState(entry ? entry.date.slice(0, 10) : firstDayOf(month));
  const [productItemId, setProductItemId] = useState(entry?.productItemId ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const category = selectable.find((c) => c.id === categoryId) ?? null;
  const isDirect = category?.nature === "DIRECT";
  const amountValue = Number(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId) return setError("Choisissez une catégorie.");
    if (!label.trim()) return setError("Donnez un intitulé à cette charge — c'est ce qui la rend reconnaissable dans six mois.");
    if (amount === "" || !Number.isFinite(amountValue) || amountValue < 0) {
      return setError("Le montant doit être un nombre positif.");
    }
    if (!date) return setError("Indiquez la date de la charge.");

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        categoryId,
        label: label.trim(),
        amount: amountValue,
        date,
        // Only a direct cost can name a product; the field is hidden otherwise
        // and must not carry a stale value from a previous selection.
        productItemId: isDirect && productItemId ? productItemId : null,
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={entry ? "Modifier la charge" : "Nouvelle charge"}
      subtitle={entry ? entry.label : "Une dépense de l'usine, rattachée à une catégorie et à une date"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : entry ? "Enregistrer" : "Ajouter la charge"}
          </Button>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Field label="Catégorie" hint={category?.description}>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {selectable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} — {COST_NATURE_LABELS[c.nature]}, {COST_BEHAVIOR_LABELS[c.behavior].toLowerCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Intitulé" hint="Ce que c'est, en clair : « Facture Sonelgaz », « Loyer atelier »">
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Loyer atelier" />
        </Field>

        <div className="form-row">
          <Field label="Montant (DZD)">
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex. 120000"
            />
          </Field>
          <Field label="Date" hint="La charge compte dans le mois de cette date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        {isDirect ? (
          <Field
            label="Produit concerné"
            hint="Laissez vide si cette charge ne se rattache pas à un seul produit — elle rejoindra alors les charges à répartir."
          >
            <select className="input" value={productItemId} onChange={(e) => setProductItemId(e.target.value)}>
              <option value="">Aucun produit en particulier</option>
              {products.map((p) => (
                <option key={p.productItemId} value={p.productItemId}>
                  {p.name} ({p.reference})
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label="Notes" hint="Facultatif — numéro de facture, précision utile plus tard">
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {amount !== "" && Number.isFinite(amountValue) && amountValue > 0 ? (
          <Banner tone="info">
            {formatCurrency(amountValue)}{" "}
            {isDirect && productItemId
              ? "seront portés directement sur ce produit."
              : "rejoindront les charges réparties sur tout ce qui est produit sur la période."}
          </Banner>
        ) : null}
      </form>
    </Modal>
  );
}
