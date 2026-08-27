import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { formatNumber } from "../../lib/format";
import { newId } from "../../lib/id";
import { todayIso } from "../../lib/date";
import { ABSENCE_TYPES, EXPECTED_HOURS_PER_DAY, type Absence, type AbsenceType, type Employee, type TimeEntry } from "./types";

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

function daysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m, 0).getDate();
}

/** Days of `type` for this employee that overlap `month` (a simple day-count, not excluding weekends). */
function absenceDaysInMonth(absences: Absence[], employeeId: string, type: AbsenceType, month: string): number {
  const monthStart = new Date(`${month}-01T00:00:00`);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  let total = 0;
  for (const a of absences) {
    if (a.employeeId !== employeeId || a.type !== type) continue;
    const start = new Date(a.startDate + "T00:00:00");
    const end = new Date(a.endDate + "T00:00:00");
    const overlapStart = start < monthStart ? monthStart : start;
    const overlapEnd = end > monthEnd ? monthEnd : end;
    if (overlapStart <= overlapEnd) {
      total += Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000) + 1;
    }
  }
  return total;
}

interface AttendancePageProps {
  employees: Employee[];
  timeEntries: TimeEntry[];
  addTimeEntry: (entry: TimeEntry) => void;
  absences: Absence[];
  addAbsence: (absence: Absence) => void;
}

export function AttendancePage({ employees, timeEntries, addTimeEntry, absences, addAbsence }: AttendancePageProps) {
  const [month, setMonth] = useState(currentMonth());

  const [entryEmployeeId, setEntryEmployeeId] = useState("");
  const [entryDate, setEntryDate] = useState(todayIso());
  const [entryHours, setEntryHours] = useState("8");

  const [absEmployeeId, setAbsEmployeeId] = useState("");
  const [absType, setAbsType] = useState<AbsenceType>(ABSENCE_TYPES[0]);
  const [absStart, setAbsStart] = useState(todayIso());
  const [absEnd, setAbsEnd] = useState(todayIso());
  const [absReason, setAbsReason] = useState("");

  const summary = useMemo(() => {
    const expectedHours = daysInMonth(month) * EXPECTED_HOURS_PER_DAY;
    return employees.map((emp) => {
      const workedHours = timeEntries
        .filter((t) => t.employeeId === emp.id && t.date.startsWith(month))
        .reduce((sum, t) => sum + t.hoursWorked, 0);
      return {
        employee: emp,
        workedHours,
        expectedHours,
        conge: absenceDaysInMonth(absences, emp.id, "Congé", month),
        maladie: absenceDaysInMonth(absences, emp.id, "Maladie", month),
        injustifiee: absenceDaysInMonth(absences, emp.id, "Absence injustifiée", month),
      };
    });
  }, [employees, timeEntries, absences, month]);

  function submitTimeEntry() {
    if (!entryEmployeeId) return;
    addTimeEntry({ id: newId("time"), employeeId: entryEmployeeId, date: entryDate, hoursWorked: Number(entryHours) || 0, source: "manual", createdAt: new Date().toISOString() });
    setEntryHours("8");
  }

  function submitAbsence() {
    if (!absEmployeeId) return;
    addAbsence({ id: newId("abs"), employeeId: absEmployeeId, type: absType, startDate: absStart, endDate: absEnd, reason: absReason.trim(), createdAt: new Date().toISOString() });
    setAbsReason("");
  }

  return (
    <div className="page-stack">
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
          <Button variant="primary" onClick={submitTimeEntry} disabled={!entryEmployeeId}>
            Ajouter l'entrée
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
                  {t}
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
          <Button variant="primary" onClick={submitAbsence} disabled={!absEmployeeId}>
            Enregistrer l'absence
          </Button>
        </div>
      </section>

      <section>
        <h2 className="section-title">Résumé du mois</h2>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Heures prévues = {EXPECTED_HOURS_PER_DAY} h × jours du mois, une approximation simple (voir PROJECT_CONTEXT.md).
        </p>
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Heures prévues</th>
                <th>Heures travaillées</th>
                <th>Congé (j)</th>
                <th>Maladie (j)</th>
                <th>Absence injustifiée (j)</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.employee.id}>
                  <td>{row.employee.fullName}</td>
                  <td className="tabular">{formatNumber(row.expectedHours)}</td>
                  <td className="tabular">{formatNumber(row.workedHours)}</td>
                  <td className="tabular">{row.conge}</td>
                  <td className="tabular">{row.maladie}</td>
                  <td className="tabular">{row.injustifiee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
