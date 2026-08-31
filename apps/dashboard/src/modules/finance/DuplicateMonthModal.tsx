import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { monthLabel, shiftMonth } from "../../lib/financeApi";

interface DuplicateMonthModalProps {
  /** The month being viewed — the destination, since you copy *into* it. */
  month: string;
  onClose: () => void;
  onSubmit: (input: { from: string; to: string; fixedOnly: boolean }) => Promise<void>;
}

/**
 * Copy last month's charges forward.
 *
 * A deliberate alternative to a recurrence rule: the rent is the same every
 * month, and re-typing it is exactly the friction that makes a cost register
 * get abandoned in March. What lands here is ordinary rows the accountant
 * edits or deletes one by one — nothing keeps generating anything behind his
 * back, and a month he has not touched stays visibly empty.
 */
export function DuplicateMonthModal({ month, onClose, onSubmit }: DuplicateMonthModalProps) {
  const [from, setFrom] = useState(shiftMonth(month, -1));
  const [fixedOnly, setFixedOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (from === month) return setError("Le mois source et le mois de destination sont identiques.");

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ from, to: month, fixedOnly });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Copie impossible.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Reprendre un mois précédent"
      subtitle={`Vers ${monthLabel(month)}`}
      onClose={onClose}
      width={540}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Copie…" : "Copier les charges"}
          </Button>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Field label="Mois à copier">
          <input className="input" type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>

        <label className="checkbox-row">
          <input type="checkbox" checked={fixedOnly} onChange={(e) => setFixedOnly(e.target.checked)} />
          <span>
            <strong>Charges fixes uniquement</strong>
            <span className="field-hint">
              Le loyer et les amortissements se répètent à l'identique. L'énergie ou la sous-traitance changent chaque mois —
              les copier vous ferait partir d'un chiffre faux.
            </span>
          </span>
        </label>

        <Banner tone="info">
          Les charges copiées deviennent des lignes normales de {monthLabel(month)} : vous les modifiez ou les supprimez une par
          une. Le coût des matières n'est jamais copié — il est recalculé depuis la production de chaque mois.
        </Banner>
      </form>
    </Modal>
  );
}
