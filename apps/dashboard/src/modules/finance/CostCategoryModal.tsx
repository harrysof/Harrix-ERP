import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import {
  COST_BEHAVIORS,
  COST_BEHAVIOR_HINTS,
  COST_BEHAVIOR_LABELS,
  COST_NATURES,
  COST_NATURE_HINTS,
  COST_NATURE_LABELS,
  type CostBehavior,
  type CostCategory,
  type CostCategoryInput,
  type CostNature,
} from "../../lib/financeApi";

interface CostCategoryModalProps {
  category?: CostCategory;
  onClose: () => void;
  onSubmit: (input: CostCategoryInput & { key: string }) => Promise<void>;
}

/**
 * Derives the machine key from the label, the same way the inventory-type
 * form does. Accents are stripped rather than encoded, so "Énergie" becomes
 * "energie" and not something nobody can type into a URL.
 */
function toKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CostCategoryModal({ category, onClose, onSubmit }: CostCategoryModalProps) {
  const [label, setLabel] = useState(category?.label ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [nature, setNature] = useState<CostNature>(category?.nature ?? "INDIRECT");
  const [behavior, setBehavior] = useState<CostBehavior>(category?.behavior ?? "FIXED");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const key = category?.key ?? toKey(label);
  // The materials category is fed by production; its two axes are what make
  // that true, so they are shown but not editable.
  const axesLocked = category?.isMaterials ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return setError("Donnez un nom à cette catégorie.");
    if (!key) return setError("Ce nom ne produit aucune clé utilisable — utilisez au moins une lettre ou un chiffre.");

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ key, label: label.trim(), description: description.trim(), nature, behavior });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={category ? "Modifier la catégorie" : "Nouvelle catégorie de coût"}
      subtitle={category ? category.label : "Un type de dépense que l'usine porte"}
      onClose={onClose}
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : category ? "Enregistrer" : "Créer la catégorie"}
          </Button>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Field
          label="Nom"
          hint={key ? `Clé : ${key}${category ? " — fixée à la création et non modifiable" : ""}` : undefined}
        >
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Gardiennage" />
        </Field>

        <Field label="Description" hint="Ce qui rentre dedans, pour que la personne suivante range au bon endroit">
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <p className="detail-type" style={{ margin: 0 }}>
          Comment cette charge se comporte
        </p>

        <div className="form-row">
          <Field label="Nature" hint={COST_NATURE_HINTS[nature]}>
            <select
              className="input"
              value={nature}
              disabled={axesLocked}
              onChange={(e) => setNature(e.target.value as CostNature)}
            >
              {COST_NATURES.map((n) => (
                <option key={n} value={n}>
                  {COST_NATURE_LABELS[n]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Comportement" hint={COST_BEHAVIOR_HINTS[behavior]}>
            <select
              className="input"
              value={behavior}
              disabled={axesLocked}
              onChange={(e) => setBehavior(e.target.value as CostBehavior)}
            >
              {COST_BEHAVIORS.map((b) => (
                <option key={b} value={b}>
                  {COST_BEHAVIOR_LABELS[b]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {axesLocked ? (
          <Banner tone="info">
            Cette catégorie est calculée depuis la production : sa nature et son comportement sont fixés, car ce sont eux qui
            rendent ce calcul juste. Son nom et sa description, eux, restent libres.
          </Banner>
        ) : (
          <Banner tone="info">
            <strong>Direct</strong> ou <strong>indirect</strong> décide de la suite : un coût direct rattaché à un produit va
            entièrement sur ce produit, un coût indirect est réparti sur tout ce qui sort de l'usine.{" "}
            <strong>Fixe</strong> ou <strong>variable</strong> ne change aucun calcul — c'est ce qui vous permet de lire, en fin
            de mois, ce que l'usine coûte même à l'arrêt.
          </Banner>
        )}
      </form>
    </Modal>
  );
}
