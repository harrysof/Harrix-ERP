import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import {
  ALLOCATION_BASES,
  ALLOCATION_BASIS_HINTS,
  ALLOCATION_BASIS_LABELS,
  type AllocationBasis,
  type AllocationDetail,
  type FinanceSettings,
} from "../../lib/financeApi";

interface PricingSettingsModalProps {
  settings: FinanceSettings;
  /** The current period's division, so the effect of a change is visible. */
  allocation: AllocationDetail;
  onClose: () => void;
  onSubmit: (input: { defaultMargin: number; allocationBasis: AllocationBasis }) => Promise<void>;
}

/**
 * The two decisions that shape every price on the Prix view.
 *
 * They live behind a separate permission (finance:manage) because they are
 * not data entry — changing the allocation basis re-prices the whole
 * catalogue at once. Both are shown with the arithmetic they produce, since
 * "au prorata des unités" means nothing until you see it as a division.
 */
export function PricingSettingsModal({ settings, allocation, onClose, onSubmit }: PricingSettingsModalProps) {
  // Held as a percentage, because that is how a factory says it. The API
  // takes a fraction — 25 here becomes 0.25 on the way out.
  const [marginPercent, setMarginPercent] = useState(String(Math.round(settings.defaultMargin * 1000) / 10));
  const [basis, setBasis] = useState<AllocationBasis>(settings.allocationBasis);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const percentValue = Number(marginPercent);
  const validMargin = marginPercent !== "" && Number.isFinite(percentValue) && percentValue >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validMargin) return setError("La marge doit être un pourcentage positif.");
    if (percentValue > 1000) return setError("Marge invalide : au-delà de 1000 %, il s'agit presque sûrement d'une faute de frappe.");

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ defaultMargin: percentValue / 100, allocationBasis: basis });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
      setSubmitting(false);
    }
  }

  const marginOnPrice = validMargin && percentValue > 0 ? percentValue / (100 + percentValue) : null;

  return (
    <Modal
      title="Marge et répartition"
      subtitle="Les deux choix qui décident de chaque prix conseillé"
      onClose={onClose}
      width={620}
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
          label="Marge par défaut (% sur le coût)"
          hint="Appliquée à tout produit qui n'a pas sa propre marge. Une marge de 25 % veut dire : vendre à coût + 25 %."
        >
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={marginPercent}
            onChange={(e) => setMarginPercent(e.target.value)}
          />
        </Field>

        {marginOnPrice !== null ? (
          <Banner tone="info">
            +{percentValue.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % sur le coût correspond à une marge
            commerciale de <strong>{(marginOnPrice * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</strong> sur
            le prix de vente. Les deux sont affichés dans le tableau, car on les confond souvent.
          </Banner>
        ) : null}

        <Field label="Base de répartition des charges indirectes" hint={ALLOCATION_BASIS_HINTS[basis]}>
          <select className="input" value={basis} onChange={(e) => setBasis(e.target.value as AllocationBasis)}>
            {ALLOCATION_BASES.map((b) => (
              <option key={b} value={b}>
                {ALLOCATION_BASIS_LABELS[b]}
              </option>
            ))}
          </select>
        </Field>

        <Banner tone="warn">
          Répartir des charges communes est un <strong>choix comptable</strong>, pas un fait. Le loyer et l'électricité n'ont pas
          de montant « par paire » : ce chiffre existe seulement parce qu'on décide d'une façon de diviser. Sur la période
          affichée, cette division donne{" "}
          {allocation.ratePerUnitOfBasis !== null ? (
            <strong>
              {formatCurrency(allocation.pool)} ÷ {allocation.divisor.toLocaleString("fr-FR")} {allocation.divisorLabel} ={" "}
              {formatCurrency(allocation.ratePerUnitOfBasis)}
            </strong>
          ) : (
            <strong>aucun résultat — la base vaut zéro sur cette période</strong>
          )}
          .
        </Banner>
      </form>
    </Modal>
  );
}
