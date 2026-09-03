import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, UserCheck, Wallet, CalendarClock, Eye, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Avatar } from "../../components/ui/Avatar";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { archiveEmployee, CONTRACT_TYPE_LABELS, fetchEmployees, unarchiveEmployee, type ApiEmployee } from "../../lib/hrApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";
import { EmployeeModal } from "./EmployeeModal";
import { EmployeeDetailModal } from "./EmployeeDetailModal";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; employee: ApiEmployee } | { kind: "detail"; employeeId: string };

/**
 * Ancienneté, rendered the way a factory actually says it ("3 ans 2 mois").
 * Takes `t` rather than importing it: this runs inside a `.map()` in the table
 * body, where a hook cannot be called.
 */
function tenureLabel(tenure: ApiEmployee["tenure"], t: (key: TranslationKey, vars?: Record<string, string | number>) => string): string {
  if (tenure.totalDays === 0) return t("hr.today");
  const parts: string[] = [];
  if (tenure.years > 0) parts.push(t("hr.tenureYears", { count: tenure.years }));
  if (tenure.months > 0) parts.push(t("hr.tenureMonths", { count: tenure.months }));
  if (tenure.years === 0 && tenure.months === 0) parts.push(t("hr.tenureDays", { count: tenure.days }));
  return parts.join(" ");
}

export function EmployeesPage() {
  const { can } = useAuth();
  const { t } = useI18n();
  const canWrite = can("hr:write");
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchEmployees({ includeArchived: true })
      .then(setEmployees)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("hr.loadFailed")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => showArchived || !e.archived)
      .filter((e) => !q || e.fullName.toLowerCase().includes(q) || e.position.toLowerCase().includes(q))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
  }, [employees, showArchived, search]);

  const active = useMemo(() => employees.filter((e) => !e.archived), [employees]);
  const cddDeadline = new Date(Date.now() + 30 * 86_400_000);
  const cddSoonEnding = active.filter((e) => e.contractType === "CDD" && e.contractEndDate && new Date(e.contractEndDate) < cddDeadline);
  const totalGrossPayroll = useMemo(() => active.reduce((sum, e) => sum + e.salary, 0), [active]);

  async function toggleArchive(employee: ApiEmployee) {
    try {
      if (employee.archived) await unarchiveEmployee(employee.id);
      else await archiveEmployee(employee.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.action"));
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="stat-grid">
        <StatCard
          icon={Users}
          label={t("hr.activeEmployees")}
          value={active.length}
          hint={t("hr.archivedCount", { count: employees.length - active.length })}
        />
        <StatCard icon={UserCheck} label={t("hr.onCDI")} value={active.filter((e) => e.contractType === "CDI").length} />
        <StatCard
          icon={Wallet}
          label={t("hr.grossPayroll")}
          value={formatCurrency(totalGrossPayroll)}
          hint={t("hr.grossPayrollHint")}
        />
        <StatCard
          icon={CalendarClock}
          label={t("hr.cddEnding")}
          value={cddSoonEnding.length}
          hint={t("hr.cddEndingHint")}
          tone={cddSoonEnding.length > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder={t("hr.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="toolbar-actions">
          <label className="checkbox-row" style={{ margin: 0 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            <span>{t("action.showArchived")}</span>
          </label>
          {canWrite ? (
            <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
              {t("hr.newEmployee")}
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="loading-text">{t("state.loading")}</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? t("hr.noMatch") : t("hr.none")}
          action={
            !search && canWrite ? (
              <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
                {t("hr.newEmployee")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="list-card">
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{t("field.name")}</th>
                  <th>{t("hr.col.position")}</th>
                  <th>{t("hr.col.contract")}</th>
                  <th>{t("hr.col.hiredOn")}</th>
                  <th>{t("hr.col.tenure")}</th>
                  <th className="num">{t("hr.col.grossSalary")}</th>
                  <th>{t("field.status")}</th>
                  <th aria-label={t("field.actions")} />
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id} className={e.archived ? "row-muted" : undefined}>
                    <td>
                      <div className="identity-cell">
                        <Avatar name={e.fullName} />
                        <button type="button" className="link-button" onClick={() => setModal({ kind: "detail", employeeId: e.id })}>
                          {e.fullName}
                        </button>
                      </div>
                    </td>
                    <td>{e.position}</td>
                    <td>{t(CONTRACT_TYPE_LABELS[e.contractType])}</td>
                    <td className="tabular">{formatDate(e.hireDate)}</td>
                    <td className="tabular">{tenureLabel(e.tenure, t)}</td>
                    <td className="tabular num">{formatCurrency(e.salary)}</td>
                    <td>
                      <Pill tone={e.archived ? "neutral" : "ok"}>{t(e.archived ? "state.archived" : "state.active")}</Pill>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button"
                          title={t("sales.file")}
                          onClick={() => setModal({ kind: "detail", employeeId: e.id })}
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        {canWrite ? (
                          <>
                            <button
                              type="button"
                              className="icon-button"
                              title={t("action.edit")}
                              onClick={() => setModal({ kind: "edit", employee: e })}
                            >
                              <Pencil size={16} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              title={t(e.archived ? "action.unarchive" : "action.archive")}
                              onClick={() => toggleArchive(e)}
                            >
                              {e.archived ? <ArchiveRestore size={16} strokeWidth={2} /> : <Archive size={16} strokeWidth={2} />}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal.kind === "add" && (
        <EmployeeModal
          employee={null}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => {
            load();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "edit" && (
        <EmployeeModal
          employee={modal.employee}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => {
            load();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "detail" && (
        <EmployeeDetailModal
          employeeId={modal.employeeId}
          onClose={() => setModal({ kind: "none" })}
          onChanged={load}
          onEdit={(employee) => setModal({ kind: "edit", employee })}
        />
      )}
    </div>
  );
}
