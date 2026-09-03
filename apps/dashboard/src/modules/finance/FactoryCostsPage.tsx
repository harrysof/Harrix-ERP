import { useCallback, useEffect, useState } from "react";
import { Coins, ClipboardList, Copy, Trash2 } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../state/LanguageContext";
import { Field } from "../../components/ui/Field";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatMonthYear } from "../../lib/format";
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
  const { t } = useI18n();
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
      .catch((e) => setError(e instanceof ApiError ? e.message : t("fin.loadCostsFailed")))
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
    if (!label.trim()) return setError(t("fin.err.costType"));
    if (!Number.isFinite(amountValue) || amountValue <= 0) return setError(t("fin.err.amount"));

    setError(null);
    setSaving(true);
    try {
      await createFactoryCost({ label: label.trim(), amount: amountValue, date });
      setLabel("");
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  async function removeCost(id: string, costLabel: string) {
    if (!window.confirm(t("fin.confirmDeleteCost", { label: costLabel }))) return;
    try {
      await deleteFactoryCost(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.delete"));
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
      setError(e instanceof ApiError ? e.message : t("fin.copyFailed"));
    } finally {
      setCopying(false);
    }
  }

  const copyableMonths = monthsWithCosts.filter((m) => m !== month);

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <Field label={t("fin.monthLabel")}>
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
        </Field>
        {writable && copyableMonths.length > 0 ? (
          <div className="toolbar-actions">
            <select className="input" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} style={{ width: 200 }}>
              <option value="">{t("fin.copyFrom")}</option>
              {copyableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthYear(m)}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={submitCopy} disabled={!copyFrom || copying}>
              <Copy size={16} strokeWidth={2} />
              {copying ? "Copie…" : `Copier vers ${formatMonthYear(month)}`}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="stat-grid">
        <StatCard
          icon={Coins}
          label={t("fin.monthTotal")}
          value={formatCurrency(data?.total ?? 0)}
          hint={formatMonthYear(month)}
        />
        <StatCard icon={ClipboardList} label={t("fin.costLines")} value={data?.costs.length ?? 0} />
      </div>

      {writable ? (
        <section className="card-section">
          <h3>{t("fin.addCostTitle")}</h3>
          <div className="form-row">
            <Field label={t("fin.costType")}>
              <input
                className="input"
                placeholder={t("fin.ph.costType")}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
            <Field label={t("fin.amountDzd")}>
              <input className="input" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t("field.date")}>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div>
            <Button variant="primary" onClick={submitCost} disabled={saving}>
              {saving ? t("action.saving") : t("fin.addCostButton")}
            </Button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <p className="loading-text">{t("state.loading")}</p>
      ) : !data || data.costs.length === 0 ? (
        <EmptyState
          title={t("fin.noCosts")}
          description={t(copyableMonths.length > 0 ? "fin.addOrCopy" : "fin.addFirstCost")}
        />
      ) : (
        <div className="list-card">
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{t("fin.costType")}</th>
                  <th>{t("field.date")}</th>
                  <th className="num">Montant</th>
                  {writable ? <th aria-label={t("field.actions")} /> : null}
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
                          <button type="button" className="icon-button" title={t("action.delete")} onClick={() => removeCost(c.id, c.label)}>
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
