import { useCallback, useEffect, useState } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  deleteZakatCalculation,
  fetchZakatCalculations,
  pinZakatCalculation,
  unpinZakatCalculation,
  updateZakatPayment,
  ZAKAT_METHODOLOGY_LABELS,
  ZAKAT_PAYMENT_STATUS_LABELS,
  type ApiZakatCalculation,
  type ZakatMethodology,
  type ZakatPaymentStatus,
} from "../../lib/zakatApi";
import { useAuth } from "../../state/AuthContext";

const STATUS_TONES: Record<ZakatPaymentStatus, "ok" | "warn" | "danger"> = {
  PAID: "ok",
  PARTIALLY_PAID: "warn",
  NOT_PAID: "danger",
};

export function ZakatHistoryPage() {
  const { can } = useAuth();
  const writable = can("finance:write");

  const [calculations, setCalculations] = useState<ApiZakatCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalFor, setPaymentModalFor] = useState<ApiZakatCalculation | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchZakatCalculations()
      .then(setCalculations)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger l'historique."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePin(calc: ApiZakatCalculation) {
    try {
      if (calc.pinned) await unpinZakatCalculation(calc.id);
      else await pinZakatCalculation(calc.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action impossible.");
    }
  }

  async function removeCalculation(calc: ApiZakatCalculation) {
    if (!window.confirm(`Supprimer le calcul du ${formatDate(calc.calculationDate)} ?`)) return;
    try {
      await deleteZakatCalculation(calc.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : calculations.length === 0 ? (
        <EmptyState title="Aucun calcul enregistré" description="Chaque calcul de Zakat effectué apparaîtra ici, avec son suivi de paiement." />
      ) : (
        <div className="list-card">
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Date de calcul</th>
                  <th>Méthodologie</th>
                  <th className="num">Base Zakat</th>
                  <th className="num">Zakat due</th>
                  <th className="num">Payé</th>
                  <th className="num">Restant</th>
                  <th>Statut</th>
                  {writable ? <th aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc) => (
                  <tr key={calc.id}>
                    <td>
                      <div className="identity-cell-lines">
                        <span className="identity-cell-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {formatDate(calc.calculationDate)}
                          {calc.pinned ? <Pill tone="ok">Sur le tableau de bord</Pill> : null}
                        </span>
                        <span className="identity-cell-sub">{calc.calculationHijriLabel}</span>
                      </div>
                    </td>
                    <td>{ZAKAT_METHODOLOGY_LABELS[calc.methodology as ZakatMethodology]}</td>
                    <td className="tabular num">{formatCurrency(calc.zakatableBase)}</td>
                    <td className="tabular num">{formatCurrency(calc.zakatDue)}</td>
                    <td className="tabular num">{formatCurrency(calc.amountPaid)}</td>
                    <td className="tabular num">{formatCurrency(calc.remaining)}</td>
                    <td>
                      <Pill tone={STATUS_TONES[calc.paymentStatus]}>{ZAKAT_PAYMENT_STATUS_LABELS[calc.paymentStatus]}</Pill>
                    </td>
                    {writable ? (
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title={calc.pinned ? "Retirer du tableau de bord" : "Exporter vers le tableau de bord"}
                            onClick={() => togglePin(calc)}
                          >
                            {calc.pinned ? <PinOff size={16} strokeWidth={2} /> : <Pin size={16} strokeWidth={2} />}
                          </button>
                          <button type="button" className="icon-button" title="Enregistrer un paiement" onClick={() => setPaymentModalFor(calc)}>
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                          <button type="button" className="icon-button" title="Supprimer" onClick={() => removeCalculation(calc)}>
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paymentModalFor ? (
        <PaymentModal
          calculation={paymentModalFor}
          onClose={() => setPaymentModalFor(null)}
          onSaved={() => {
            setPaymentModalFor(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function PaymentModal({
  calculation,
  onClose,
  onSaved,
}: {
  calculation: ApiZakatCalculation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amountPaid, setAmountPaid] = useState(String(calculation.amountPaid));
  const [paymentDate, setPaymentDate] = useState(calculation.paymentDate?.slice(0, 10) ?? todayIso());
  const [notes, setNotes] = useState(calculation.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = Number(amountPaid);
    if (!Number.isFinite(value) || value < 0) return setError("Le montant payé doit être un nombre positif.");

    setError(null);
    setSaving(true);
    try {
      await updateZakatPayment(calculation.id, { amountPaid: value, paymentDate, notes: notes.trim() || undefined });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Enregistrer un paiement"
      subtitle={`Zakat due : ${formatCurrency(calculation.zakatDue)}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field label="Montant payé (DZD)">
          <input className="input" type="number" min={0} step="any" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
        </Field>
        <Field label="Date de paiement">
          <input className="input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </Field>
        <Field label="Notes" hint="Facultatif">
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
