import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { formatRate, type ProductCosting } from "../../lib/financeApi";

interface ProductMarginModalProps {
  product: ProductCosting;
  defaultMargin: number;
  onClose: () => void;
  onSubmit: (targetMargin: number | null) => Promise<void>;
}

/**
 * A margin for one product, when the factory default does not fit — a premium
 * model sold at +40 % while the rest of the range runs at +25 %.
 *
 * Clearing the field restores the default rather than storing 0 %: "follow
 * the factory" and "sell at cost" are different intentions and must not
 * collapse into the same stored value.
 */
export function ProductMarginModal({ product, defaultMargin, onClose, onSubmit }: ProductMarginModalProps) {
  const [percent, setPercent] = useState(product.marginIsOverride ? String(Math.round(product.margin * 1000) / 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const value = Number(percent);
  const usesDefault = percent.trim() === "";
  const effective = usesDefault ? defaultMargin : value / 100;
  const preview =
    product.unitCost !== null && (usesDefault || (Number.isFinite(value) && value >= 0))
      ? product.unitCost * (1 + effective)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usesDefault && (!Number.isFinite(value) || value < 0)) {
      return setError("La marge doit être un pourcentage positif, ou vide pour suivre la marge de l'usine.");
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(usesDefault ? null : value / 100);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Marge de ce produit"
      subtitle={`${product.name} (${product.reference})`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Field
          label="Marge (% sur le coût)"
          hint={`Laissez vide pour suivre la marge de l'usine (${formatRate(defaultMargin)}).`}
        >
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder={`${Math.round(defaultMargin * 1000) / 10}`}
          />
        </Field>

        {product.unitCost === null ? (
          <Banner tone="warn">
            Ce produit n'a pas de coût de revient sur la période affichée — aucune production déclarée. La marge sera
            enregistrée, mais aucun prix ne peut en être déduit tant qu'un lot n'a pas été produit.
          </Banner>
        ) : (
          <Banner tone="info">
            Coût de revient {formatCurrency(product.unitCost)} × (1 + {formatRate(effective)}) ={" "}
            <strong>{preview !== null ? formatCurrency(preview) : "—"}</strong> de prix conseillé
            {usesDefault ? " (marge de l'usine)" : ""}.
          </Banner>
        )}
      </form>
    </Modal>
  );
}
