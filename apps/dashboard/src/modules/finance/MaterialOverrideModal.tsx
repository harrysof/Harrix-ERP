import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { monthLabel, type MaterialOverride } from "../../lib/financeApi";

interface MaterialOverrideModalProps {
  month: string;
  /** What production actually consumed — never overwritten, only accompanied. */
  computed: number;
  existing?: MaterialOverride | null;
  onClose: () => void;
  onSubmit: (input: { month: string; amount: number; reason: string }) => Promise<void>;
  onClear?: () => Promise<void>;
}

/**
 * The accountant's correction to a month's raw-material cost.
 *
 * Deliberately not an edit box on the register line. The computed figure —
 * what the production lots really consumed, lot cost by lot cost — stays on
 * screen next to the corrected one, with the reason attached. Six months
 * later the question "why is this number not the one the system computed?"
 * has an answer written down, instead of a total nobody can reconstruct.
 */
export function MaterialOverrideModal({
  month,
  computed,
  existing,
  onClose,
  onSubmit,
  onClear,
}: MaterialOverrideModalProps) {
  const [amount, setAmount] = useState(existing ? String(existing.amount) : String(computed));
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amountValue = Number(amount);
  const valid = amount !== "" && Number.isFinite(amountValue) && amountValue >= 0;
  const gap = valid ? amountValue - computed : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return setError("Le montant corrigé doit être un nombre positif.");
    if (!reason.trim()) {
      return setError("Indiquez le motif. Une correction sans motif ne se distingue plus d'une faute de frappe.");
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ month, amount: amountValue, reason: reason.trim() });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
      setSubmitting(false);
    }
  }

  async function handleClear() {
    if (!onClear) return;
    setSubmitting(true);
    try {
      await onClear();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Corriger le coût des matières"
      subtitle={monthLabel(month)}
      onClose={onClose}
      width={560}
      footer={
        <>
          {existing && onClear ? (
            <Button variant="danger" onClick={handleClear} disabled={submitting}>
              Revenir au calcul
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer la correction"}
          </Button>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <div className="override-compare">
          <div>
            <span className="field-label">Calculé depuis la production</span>
            <strong className="override-computed">{formatCurrency(computed)}</strong>
          </div>
          <span className="override-arrow" aria-hidden="true">
            →
          </span>
          <div>
            <span className="field-label">Retenu pour ce mois</span>
            <strong className="override-kept">{valid ? formatCurrency(amountValue) : "—"}</strong>
          </div>
        </div>

        <Field label="Montant corrigé (DZD)">
          <input className="input" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        <Field label="Motif" hint="Par exemple : inventaire physique de fin de mois, facture reçue après clôture">
          <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        {valid && Math.abs(gap) > 0.01 ? (
          <Banner tone="warn">
            Écart de <strong>{formatCurrency(Math.abs(gap))}</strong> {gap > 0 ? "en plus" : "en moins"} par rapport à ce que la
            production a consommé. Le coût matières de chaque produit sera ajusté dans la même proportion, et la valeur calculée
            restera affichée à côté de la vôtre.
          </Banner>
        ) : (
          <Banner tone="info">
            La valeur calculée n'est jamais écrasée : elle reste visible sur la ligne, à côté de la vôtre et de votre motif.
          </Banner>
        )}
      </form>
    </Modal>
  );
}
