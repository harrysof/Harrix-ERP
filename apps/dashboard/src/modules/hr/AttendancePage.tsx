import { useCallback, useEffect, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import { formatNumber } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  createAbsence,
  createTimeEntry,
  EXPECTED_HOURS_PER_DAY,
  fetchEmployees,
  fetchMonthlySummary,
  type AbsenceType,
  type ApiEmployee,
  type MonthlySummary,
} from "../../lib/hrApi";

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

export function AttendancePage() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entryEmployeeId, setEntryEmployeeId] = useState("");
  const [entryDate, setEntryDate] = useState(todayIso());
  const [entryHours, setEntryHours] = useState("8");
  const [savingEntry, setSavingEntry] = useState(false);

  const [absEmployeeId, setAbsEmployeeId] = useState("");
  const [absType, setAbsType] = useState<AbsenceType>(ABSENCE_TYPES[0]);
  const [absStart, setAbsStart] = useState(todayIso());
  const [absEnd, setAbsEnd] = useState(todayIso());
  const [absReason, setAbsReason] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([fetchEmployees({ includeArchived: false }), fetchMonthlySummary(month)])
      .then(([nextEmployees, nextSummary]) => {
        setEmployees(nextEmployees);
        setSummary(nextSummary);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger la présence."))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitTimeEntry() {
    if (!entryEmployeeId) return;
    setSavingEntry(true);
    try {
      await createTimeEntry({ employeeId: entryEmployeeId, date: entryDate, hoursWorked: Number(entryHours) || 0 });
      setEntryHours("8");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSavingEntry(false);
    }
  }

  async function submitAbsence() {
    if (!absEmployeeId) return;
    setSavingAbsence(true);
    try {
      await createAbsence({ employeeId: absEmployeeId, type: absType, startDate: absStart, endDate: absEnd, reason: absReason.trim() || undefined });
      setAbsReason("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSavingAbsence(false);
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <Field label="Mois">
        <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
      </Field>

      <section className="card-section">
        <h3>Ajouter des heures travaillées</h3>
        <div className="form-row">
          <Field label="Employé">
            <select className="input" value={entryEmployeeId} onChange={(e) => setEntryEmployeeId(e.target.value)}>
              <option value="">— Choisir —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </Field>
          <Field label="Heures">
            <input className="input" type="number" min={0} max={24} value={entryHours} onChange={(e) => setEntryHours(e.target.value)} />
          </Field>
        </div>
        <div>
          <Button variant="primary" onClick={submitTimeEntry} disabled={!entryEmployeeId || savingEntry}>
            {savingEntry ? "Enregistrement…" : "Ajouter l'entrée"}
          </Button>
        </div>
      </section>

      <section className="card-section">
        <h3>Déclarer une absence</h3>
        <div className="form-row">
          <Field label="Employé">
            <select className="input" value={absEmployeeId} onChange={(e) => setAbsEmployeeId(e.target.value)}>
              <option value="">— Choisir —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select className="input" value={absType} onChange={(e) => setAbsType(e.target.value as AbsenceType)}>
              {ABSENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ABSENCE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Du">
            <input className="input" type="date" value={absStart} onChange={(e) => setAbsStart(e.target.value)} />
          </Field>
          <Field label="Au">
            <input className="input" type="date" value={absEnd} onChange={(e) => setAbsEnd(e.target.value)} />
          </Field>
          <Field label="Raison (optionnel)">
            <input className="input" value={absReason} onChange={(e) => setAbsReason(e.target.value)} />
          </Field>
        </div>
        <div>
          <Button variant="primary" onClick={submitAbsence} disabled={!absEmployeeId || savingAbsence}>
            {savingAbsence ? "Enregistrement…" : "Enregistrer l'absence"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="section-title">Résumé du mois</h2>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Heures prévues = {EXPECTED_HOURS_PER_DAY} h × jours du mois, une approximation simple (voir PROJECT_CONTEXT.md).
        </p>
        {loading || !summary ? (
          <p className="loading-text">Chargement…</p>
        ) : summary.rows.length === 0 ? (
          <p className="muted">Aucun employé actif.</p>
        ) : (
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th className="num">Heures prévues</th>
                  <th className="num">Heures travaillées</th>
                  <th className="num">Congé (j)</th>
                  <th className="num">Maladie (j)</th>
                  <th className="num">Absence injustifiée (j)</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.fullName}</td>
                    <td className="tabular num">{formatNumber(row.expectedHours)}</td>
                    <td className="tabular num">{formatNumber(row.workedHours)}</td>
                    <td className="tabular num">{row.absences.CONGE}</td>
                    <td className="tabular num">{row.absences.MALADIE}</td>
                    <td className="tabular num">{row.absences.INJUSTIFIEE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
