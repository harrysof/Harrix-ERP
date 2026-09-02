import { useCallback, useEffect, useState } from "react";
import { Coins, ClipboardList, Copy, Trash2 } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  copyFactoryCosts,
  createFactoryCost,
  deleteFactoryCost,
  fetchFactoryCosts,
  fetchMonthsWithCosts,
  type MonthlyCosts,
} from "../../lib/financeApi";
import { useAuth } from "../../state/AuthContext";

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, m - 1, 1)));
}

/**
 * The factory's general operating costs (rent, electricity, indirect
 * wages, maintenance…) as a running monthly ledger — a permanent, database
 * table version of the margin calculator's cost lines: type, montant, date.
 * Filtered by month, with a one-click way to copy a month's costs into
 * another one instead of retyping recurring charges every month.
 */
export function FactoryCostsPage() {
  const { can } = useAuth();
  const writable = can("finance:write");

  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthlyCosts | null>(null);
  const [monthsWithCosts, setMonthsWithCosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  const [copyFrom, setCopyFrom] = useState("");
  const [copying, setCopying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([fetchFactoryCosts(month), fetchMonthsWithCosts()])
      .then(([costs, months]) => {
        setData(costs);
        setMonthsWithCosts(months);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les coûts."))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // A date typed for a previous month shouldn't silently land in the one
    // now being viewed — keep the add-cost form's default inside it.
    setDate(month === currentMonth() ? todayIso() : `${month}-01`);
  }, [month]);

  async function submitCost() {
    const amountValue = Number(amount);
    if (!label.trim()) return setError("Le type de coût est obligatoire.");
    if (!Number.isFinite(amountValue) || amountValue <= 0) return setError("Le montant doit être un nombre positif.");

    setError(null);
    setSaving(true);
    try {
      await createFactoryCost({ label: label.trim(), amount: amountValue, date });
      setLabel("");
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCost(id: string, costLabel: string) {
    if (!window.confirm(`Supprimer le coût « ${costLabel} » ?`)) return;
    try {
      await deleteFactoryCost(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  async function submitCopy() {
    if (!copyFrom) return;
    setError(null);
    setCopying(true);
    try {
      await copyFactoryCosts(copyFrom, month);
      setCopyFrom("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Copie impossible.");
    } finally {
      setCopying(false);
    }
  }

  const copyableMonths = monthsWithCosts.filter((m) => m !== month);

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <Field label="Mois">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
        </Field>
        {writable && copyableMonths.length > 0 ? (
          <div className="toolbar-actions">
            <select className="input" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} style={{ width: 200 }}>
              <option value="">Copier depuis…</option>
              {copyableMonths.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={submitCopy} disabled={!copyFrom || copying}>
              <Copy size={16} strokeWidth={2} />
              {copying ? "Copie…" : `Copier vers ${monthLabel(month)}`}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="stat-grid">
        <StatCard icon={Coins} label="Coût total du mois" value={formatCurrency(data?.total ?? 0)} hint={monthLabel(month)} />
        <StatCard icon={ClipboardList} label="Postes de coûts" value={data?.costs.length ?? 0} />
      </div>

      {writable ? (
        <section className="card-section">
          <h3>Ajouter un coût</h3>
          <div className="form-row">
            <Field label="Type de coût">
              <input
                className="input"
                placeholder="Ex. loyer, électricité, salaires indirects…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
            <Field label="Montant (DZD)">
              <input className="input" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div>
            <Button variant="primary" onClick={submitCost} disabled={saving}>
              {saving ? "Enregistrement…" : "+ Ajouter le coût"}
            </Button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : !data || data.costs.length === 0 ? (
        <EmptyState
          title="Aucun coût enregistré pour ce mois"
          description={
            copyableMonths.length > 0
              ? "Ajoutez un coût ci-dessus, ou copiez ceux d'un autre mois."
              : "Ajoutez le premier coût de l'usine ci-dessus."
          }
        />
      ) : (
        <div className="list-card">
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Type de coût</th>
                  <th>Date</th>
                  <th className="num">Montant</th>
                  {writable ? <th aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {data.costs.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td className="tabular">{formatDate(c.date)}</td>
                    <td className="tabular num">{formatCurrency(c.amount)}</td>
                    {writable ? (
                      <td>
                        <div className="row-actions">
                          <button type="button" className="icon-button" title="Supprimer" onClick={() => removeCost(c.id, c.label)}>
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
    </div>
  );
}
