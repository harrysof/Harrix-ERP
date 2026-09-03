import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, TrendingUp, CalendarOff, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Avatar } from "../../components/ui/Avatar";
import { StatCard } from "../../components/ui/StatCard";
import { Modal } from "../../components/ui/Modal";
import { ApiError } from "../../lib/api";
import { formatDate, formatMonthYear, formatNumber } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  createAbsence,
  createOvertimeEntry,
  createTimeEntry,
  fetchAbsences,
  fetchEmployees,
  fetchMonthlySummary,
  fetchOvertimeEntries,
  type AbsenceType,
  type ApiAbsence,
  type ApiEmployee,
  type ApiOvertimeEntry,
  type MonthlySummary,
} from "../../lib/hrApi";
import { useI18n } from "../../state/LanguageContext";

type EntryTab = "hours" | "absence" | "overtime";
type ReasonModalState = { kind: "absence" | "overtime"; employeeId: string; employeeName: string } | null;

function currentMonth(): string {
  return todayIso().slice(0, 7);
}

/** [from, to) — the same half-open month bounds the backend uses for its overlap queries. */
function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const from = `${year}-${String(m).padStart(2, "0")}-01`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? year + 1 : year;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to };
}

export function AttendancePage() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entryPanelOpen, setEntryPanelOpen] = useState(false);
  const [entryTab, setEntryTab] = useState<EntryTab>("hours");

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

  const [otEmployeeId, setOtEmployeeId] = useState("");
  const [otStart, setOtStart] = useState(todayIso());
  const [otEnd, setOtEnd] = useState(todayIso());
  const [otHours, setOtHours] = useState("");
  const [otReason, setOtReason] = useState("");
  const [savingOvertime, setSavingOvertime] = useState(false);

  const [reasonModal, setReasonModal] = useState<ReasonModalState>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([fetchEmployees({ includeArchived: false }), fetchMonthlySummary(month)])
      .then(([nextEmployees, nextSummary]) => {
        setEmployees(nextEmployees);
        setSummary(nextSummary);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("att.loadFailed")))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!summary) return null;
    return summary.rows.reduce(
      (acc, row) => {
        acc.worked += row.workedHours;
        acc.overtime += row.overtimeHours;
        acc.unjustified += row.absences.INJUSTIFIEE ?? 0;
        return acc;
      },
      { worked: 0, overtime: 0, unjustified: 0 },
    );
  }, [summary]);

  async function submitTimeEntry() {
    if (!entryEmployeeId) return;
    setSavingEntry(true);
    try {
      await createTimeEntry({ employeeId: entryEmployeeId, date: entryDate, hoursWorked: Number(entryHours) || 0 });
      setEntryHours("8");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
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
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSavingAbsence(false);
    }
  }

  async function submitOvertime() {
    if (!otEmployeeId) return;
    setSavingOvertime(true);
    try {
      await createOvertimeEntry({
        employeeId: otEmployeeId,
        startDate: otStart,
        endDate: otEnd,
        hours: Number(otHours) || 0,
        reason: otReason.trim() || undefined,
      });
      setOtHours("");
      setOtReason("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSavingOvertime(false);
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <Field label={t("att.monthLabel")}>
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
        </Field>
        <div className="toolbar-actions">
          <Button
            variant="secondary"
            onClick={() => setEntryPanelOpen((open) => !open)}
            aria-expanded={entryPanelOpen}
            aria-controls="hr-entry-panel"
          >
            {entryPanelOpen ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
            Saisir une entrée
          </Button>
        </div>
      </div>

      {entryPanelOpen ? (
        <section id="hr-entry-panel" className="card-section">
          <div className="tab-strip">
            <button type="button" className={`tab-strip-item ${entryTab === "hours" ? "tab-strip-item-active" : ""}`} onClick={() => setEntryTab("hours")}>
              {t("att.workedHours")}
            </button>
            <button
              type="button"
              className={`tab-strip-item ${entryTab === "absence" ? "tab-strip-item-active" : ""}`}
              onClick={() => setEntryTab("absence")}
            >
              {t("att.absence")}
            </button>
            <button
              type="button"
              className={`tab-strip-item ${entryTab === "overtime" ? "tab-strip-item-active" : ""}`}
              onClick={() => setEntryTab("overtime")}
            >
              {t("att.overtimeSection")}
            </button>
          </div>

          {entryTab === "hours" ? (
            <>
              <div className="form-row">
                <Field label={t("field.employee")}>
                  <select className="input" value={entryEmployeeId} onChange={(e) => setEntryEmployeeId(e.target.value)}>
                    <option value="">{t("att.choose")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("field.date")}>
                  <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </Field>
                <Field label={t("att.hours")}>
                  <input className="input" type="number" min={0} max={24} value={entryHours} onChange={(e) => setEntryHours(e.target.value)} />
                </Field>
              </div>
              <div>
                <Button variant="primary" onClick={submitTimeEntry} disabled={!entryEmployeeId || savingEntry}>
                  {savingEntry ? t("action.saving") : t("att.addEntry")}
                </Button>
              </div>
            </>
          ) : null}

          {entryTab === "absence" ? (
            <>
              <div className="form-row">
                <Field label={t("field.employee")}>
                  <select className="input" value={absEmployeeId} onChange={(e) => setAbsEmployeeId(e.target.value)}>
                    <option value="">{t("att.choose")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("field.type")}>
                  <select className="input" value={absType} onChange={(e) => setAbsType(e.target.value as AbsenceType)}>
                    {ABSENCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(ABSENCE_TYPE_LABELS[type])}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="form-row">
                <Field label={t("field.from")}>
                  <input className="input" type="date" value={absStart} onChange={(e) => setAbsStart(e.target.value)} />
                </Field>
                <Field label={t("field.to")}>
                  <input className="input" type="date" value={absEnd} onChange={(e) => setAbsEnd(e.target.value)} />
                </Field>
                <Field label={t("att.reasonOptional")}>
                  <input className="input" value={absReason} onChange={(e) => setAbsReason(e.target.value)} />
                </Field>
              </div>
              <div>
                <Button variant="primary" onClick={submitAbsence} disabled={!absEmployeeId || savingAbsence}>
                  {savingAbsence ? t("action.saving") : t("att.saveAbsence")}
                </Button>
              </div>
            </>
          ) : null}

          {entryTab === "overtime" ? (
            <>
              <div className="form-row">
                <Field label={t("field.employee")}>
                  <select className="input" value={otEmployeeId} onChange={(e) => setOtEmployeeId(e.target.value)}>
                    <option value="">{t("att.choose")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("field.from")}>
                  <input className="input" type="date" value={otStart} onChange={(e) => setOtStart(e.target.value)} />
                </Field>
                <Field label={t("field.to")}>
                  <input className="input" type="date" value={otEnd} onChange={(e) => setOtEnd(e.target.value)} />
                </Field>
              </div>
              <div className="form-row">
                <Field label={t("att.hours")}>
                  <input className="input" type="number" min={0} max={400} value={otHours} onChange={(e) => setOtHours(e.target.value)} />
                </Field>
                <Field label={t("att.reasonOptional")}>
                  <input className="input" value={otReason} onChange={(e) => setOtReason(e.target.value)} />
                </Field>
              </div>
              <div>
                <Button variant="primary" onClick={submitOvertime} disabled={!otEmployeeId || savingOvertime}>
                  {savingOvertime ? t("action.saving") : t("att.addOvertime")}
                </Button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="inventory-heading">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {t("att.monthSummary")}
          </h2>
          <p className="inventory-description">
            {t("att.expectedFormula", { month: formatMonthYear(month) })}
          </p>
        </div>

        {loading || !summary ? (
          <p className="loading-text">{t("state.loading")}</p>
        ) : summary.rows.length === 0 ? (
          <p className="muted">{t("att.noActiveEmployee")}</p>
        ) : (
          <div className="page-stack" style={{ gap: 14 }}>
            <div className="stat-grid">
              <StatCard icon={Users} label={t("att.employees")} value={summary.rows.length} />
              <StatCard
                icon={Clock}
                label={t("att.workedHours")}
                value={formatNumber(totals?.worked ?? 0)}
                hint={formatMonthYear(month)}
              />
              <StatCard
                icon={TrendingUp}
                label={t("att.overtimeSection")}
                value={formatNumber(totals?.overtime ?? 0)}
                hint={formatMonthYear(month)}
                tone={totals && totals.overtime > 0 ? "warn" : "neutral"}
              />
              <StatCard
                icon={CalendarOff}
                label={t("att.unjustifiedAbsences")}
                value={t("att.daysSuffix", { count: totals?.unjustified ?? 0 })}
                tone={totals && totals.unjustified > 0 ? "danger" : "ok"}
              />
            </div>

            <div className="list-card">
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("field.employee")}</th>
                      <th className="num">{t("att.col.expectedHours")}</th>
                      <th className="num">{t("att.col.workedHours")}</th>
                      <th className="num">{t("att.col.overtime")}</th>
                      <th className="num">{t("att.col.sickDays")}</th>
                      <th className="num">{t("att.col.unjustifiedDays")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rows.map((row) => (
                      <tr key={row.employeeId}>
                        <td>
                          <div className="identity-cell">
                            <Avatar name={row.fullName} />
                            <span className="identity-cell-name">{row.fullName}</span>
                          </div>
                        </td>
                        <td className="tabular num">{formatNumber(row.expectedHours)}</td>
                        <td className="tabular num">{formatNumber(row.workedHours)}</td>
                        <td className="tabular num">
                          {row.overtimeHours > 0 ? (
                            <button
                              type="button"
                              className="cell-button"
                              onClick={() => setReasonModal({ kind: "overtime", employeeId: row.employeeId, employeeName: row.fullName })}
                            >
                              {formatNumber(row.overtimeHours)}
                            </button>
                          ) : (
                            formatNumber(row.overtimeHours)
                          )}
                        </td>
                        <td className="tabular num">{row.absences.MALADIE}</td>
                        <td className="tabular num">
                          {row.absences.INJUSTIFIEE > 0 ? (
                            <button
                              type="button"
                              className="cell-button cell-button-danger"
                              onClick={() => setReasonModal({ kind: "absence", employeeId: row.employeeId, employeeName: row.fullName })}
                            >
                              {row.absences.INJUSTIFIEE}
                            </button>
                          ) : (
                            row.absences.INJUSTIFIEE
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {reasonModal ? (
        <ReasonModal
          kind={reasonModal.kind}
          employeeId={reasonModal.employeeId}
          employeeName={reasonModal.employeeName}
          month={month}
          onClose={() => setReasonModal(null)}
        />
      ) : null}
    </div>
  );
}

/** Shows why the hours/days behind a clicked résumé cell were declared — the raison entered when it was first added. */
function ReasonModal({
  kind,
  employeeId,
  employeeName,
  month,
  onClose,
}: {
  kind: "absence" | "overtime";
  employeeId: string;
  employeeName: string;
  month: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [absences, setAbsences] = useState<ApiAbsence[] | null>(null);
  const [overtime, setOvertime] = useState<ApiOvertimeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { from, to } = monthRange(month);
    if (kind === "absence") {
      fetchAbsences({ employeeId, from, to })
        .then((rows) => setAbsences(rows.filter((a) => a.type === "INJUSTIFIEE")))
        .catch((e) => setError(e instanceof ApiError ? e.message : t("error.loadDetail")));
    } else {
      fetchOvertimeEntries({ employeeId, from, to })
        .then(setOvertime)
        .catch((e) => setError(e instanceof ApiError ? e.message : t("error.loadDetail")));
    }
  }, [kind, employeeId, month]);

  return (
    <Modal
      title={t(kind === "absence" ? "att.unjustifiedSection" : "att.overtimeSection")}
      subtitle={`${employeeName} — ${formatMonthYear(month)}`}
      onClose={onClose}
      width={560}
      footer={<Button onClick={onClose}>{t("action.close")}</Button>}
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {kind === "absence" ? (
        !absences ? (
          <p className="loading-text">{t("state.loading")}</p>
        ) : absences.length === 0 ? (
          <p className="muted">{t("att.noUnjustified")}</p>
        ) : (
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{t("field.from")}</th>
                  <th>{t("field.to")}</th>
                  <th>{t("field.reason")}</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((a) => (
                  <tr key={a.id}>
                    <td className="tabular">{formatDate(a.startDate)}</td>
                    <td className="tabular">{formatDate(a.endDate)}</td>
                    <td>{a.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : !overtime ? (
        <p className="loading-text">{t("state.loading")}</p>
      ) : overtime.length === 0 ? (
        <p className="muted">{t("att.noOvertime")}</p>
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>{t("field.from")}</th>
                <th>{t("field.to")}</th>
                <th className="num">{t("att.hours")}</th>
                <th>{t("field.reason")}</th>
              </tr>
            </thead>
            <tbody>
              {overtime.map((o) => (
                <tr key={o.id}>
                  <td className="tabular">{formatDate(o.startDate)}</td>
                  <td className="tabular">{formatDate(o.endDate)}</td>
                  <td className="tabular num">{o.hours}</td>
                  <td>{o.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
