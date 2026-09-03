import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { StatCard } from "../../components/ui/StatCard";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  ABSENCE_TYPE_LABELS,
  archiveEmployee,
  CONTRACT_TYPE_LABELS,
  fetchEmployee,
  MARITAL_STATUS_LABELS,
  unarchiveEmployee,
  type ApiEmployee,
  type ApiEmployeeDetail,
} from "../../lib/hrApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import { Rich } from "../../components/ui/Rich";
import type { TranslationKey } from "../../lib/i18n";

interface EmployeeDetailModalProps {
  employeeId: string;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (employee: ApiEmployee) => void;
}

function tenureLabel(
  tenure: ApiEmployeeDetail["tenure"],
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  if (tenure.totalDays === 0) return t("hr.today");
  const parts: string[] = [];
  if (tenure.years > 0) parts.push(t("hr.tenureYears", { count: tenure.years }));
  if (tenure.months > 0) parts.push(t("hr.tenureMonths", { count: tenure.months }));
  if (tenure.years === 0) parts.push(t("hr.tenureDays", { count: tenure.days }));
  return parts.join(" ");
}

/**
 * §HR's employee card — the "fiche" the stock module already has per item:
 * the profile, the payroll estimate it implies, and the recent ledgers
 * (hours, absences) that explain how it got there.
 */
export function EmployeeDetailModal({ employeeId, onClose, onChanged, onEdit }: EmployeeDetailModalProps) {
  const { can } = useAuth();
  const { t, tn } = useI18n();
  const canWrite = can("hr:write");
  const [employee, setEmployee] = useState<ApiEmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  function load() {
    setLoading(true);
    fetchEmployee(employeeId)
      .then(setEmployee)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("hr.loadFileFailed")))
      .finally(() => setLoading(false));
  }

  async function toggleArchive() {
    if (!employee) return;
    setBusy(true);
    try {
      if (employee.archived) await unarchiveEmployee(employee.id);
      else await archiveEmployee(employee.id);
      onChanged();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.action"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !employee) {
    return (
      <Modal title={t("hr.fileTitle")} onClose={onClose} width={860}>
        {error ? <Banner tone="danger">{error}</Banner> : <p className="loading-text">{t("state.loading")}</p>}
      </Modal>
    );
  }

  const contractSoonEnding =
    employee.contractType === "CDD" && employee.contractEndDate && new Date(employee.contractEndDate) < new Date(Date.now() + 30 * 86_400_000);

  const leaveAbsences = employee.absences.filter((a) => a.type === "CONGE");
  const otherAbsences = employee.absences.filter((a) => a.type !== "CONGE");
  const leaveDaysTotal = leaveAbsences.reduce((sum, a) => {
    const days = Math.round((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / 86_400_000) + 1;
    return sum + Math.max(days, 0);
  }, 0);

  return (
    <Modal
      title={employee.fullName}
      subtitle={employee.position}
      onClose={onClose}
      width={860}
      footer={
        <>
          <Button onClick={onClose}>{t("action.close")}</Button>
          {canWrite ? (
            <>
              <Button onClick={() => onEdit(employee)}>{t("action.edit")}</Button>
              <Button variant={employee.archived ? "secondary" : "danger"} onClick={toggleArchive} disabled={busy}>
                {t(employee.archived ? "action.unarchive" : "action.archive")}
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <div className="form-stack">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <div className="batch-meta">
          <Meta
            label={t("field.status")}
            value={
              <Pill tone={employee.archived ? "neutral" : "ok"}>
                {t(employee.archived ? "state.archived" : "state.active")}
              </Pill>
            }
          />
          <Meta label={t("hr.col.contract")} value={t(CONTRACT_TYPE_LABELS[employee.contractType])} />
          <Meta label={t("hr.col.hiredOn")} value={formatDate(employee.hireDate)} />
          <Meta label={t("hr.tenure")} value={tenureLabel(employee.tenure, t)} />
          <Meta label={t("hr.hoursPerDay")} value={`${employee.expectedHoursPerDay} ${t("unit.hours")}`} />
        </div>

        {employee.contractType === "CDD" && employee.contractEndDate ? (
          <Banner tone={contractSoonEnding ? "warn" : "info"}>
            {t("hr.cddBanner", {
              date: formatDate(employee.contractEndDate),
              warning: contractSoonEnding ? t("hr.cddSoon") : ".",
            })}
          </Banner>
        ) : null}

        <div className="stat-grid">
          <StatCard label={t("hr.grossPay")} value={formatCurrency(employee.payEstimate.gross)} hint={t("hr.monthly")} />
          <StatCard label={t("hr.cnasEmployee")} value={formatCurrency(employee.payEstimate.cnas)} hint={t("hr.cnasRate")} />
          <StatCard
            label={t("hr.irgEstimate")}
            value={formatCurrency(employee.payEstimate.irg)}
            hint={t("hr.irgHint")}
            tone="warn"
          />
          <StatCard label={t("hr.netEstimate")} value={formatCurrency(employee.payEstimate.net)} hint={t("hr.netFormula")} />
        </div>

        <Banner tone="warn">
          <Rich text={t("hr.irgWarning")} parts={{ lead: <strong>{t("hr.irgWarningLead")}</strong> }} />
        </Banner>

        <section>
          <h4 className="section-title">{t("hr.identityAdmin")}</h4>
          <div className="detail-grid">
            <DetailField label={t("field.phone")} value={employee.phone} />
            <DetailField label={t("field.address")} value={employee.address} />
            <DetailField label={t("hr.birthDate")} value={employee.birthDate ? formatDate(employee.birthDate) : null} />
            <DetailField label={t("hr.nin")} value={employee.nin} />
            <DetailField label={t("hr.cnasNumber")} value={employee.cnasNumber} />
            <DetailField
              label={t("hr.maritalStatus")}
              value={employee.maritalStatus ? t(MARITAL_STATUS_LABELS[employee.maritalStatus]) : null}
            />
            <DetailField label={t("hr.dependents")} value={String(employee.dependentChildren)} />
            <DetailField label={t("hr.rib")} value={employee.bankRib} />
          </div>
        </section>

        {employee.emergencyContactName || employee.emergencyContactPhone ? (
          <section>
            <h4 className="section-title">{t("hr.emergencyContact")}</h4>
            <p className="batch-notes">
              {employee.emergencyContactName ?? "—"}
              {employee.emergencyContactPhone ? ` · ${employee.emergencyContactPhone}` : ""}
            </p>
          </section>
        ) : null}

        {employee.notes ? (
          <section>
            <h4 className="section-title">{t("field.notes")}</h4>
            <p className="batch-notes">{employee.notes}</p>
          </section>
        ) : null}

        <section>
          <h4 className="section-title">{t("hr.recentHours")}</h4>
          {employee.timeEntries.length === 0 ? (
            <p className="muted">{t("hr.noHours")}</p>
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>{t("field.date")}</th>
                    <th className="num">{t("att.hours")}</th>
                    <th>{t("hr.source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="tabular">{formatDate(entry.date)}</td>
                      <td className="tabular num">{entry.hoursWorked}</td>
                      <td>{t(entry.source === "device" ? "hr.sourceDevice" : "hr.sourceManual")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h4 className="section-title">{t("hr.recentOvertime")}</h4>
          {employee.overtimeEntries.length === 0 ? (
            <p className="muted">{t("hr.noOvertime")}</p>
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
                  {employee.overtimeEntries.map((o) => (
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
        </section>

        <section>
          <h4 className="section-title">{t("hr.leave")}</h4>
          {leaveAbsences.length === 0 ? (
            <p className="muted">{t("hr.noLeave")}</p>
          ) : (
            <>
              <p className="field-hint" style={{ marginTop: -4 }}>
                {t("hr.leaveTotal", { count: tn("hr.dayCount", leaveDaysTotal) })}
              </p>
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
                    {leaveAbsences.map((a) => (
                      <tr key={a.id}>
                        <td className="tabular">{formatDate(a.startDate)}</td>
                        <td className="tabular">{formatDate(a.endDate)}</td>
                        <td>{a.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section>
          <h4 className="section-title">{t("hr.recentAbsences")}</h4>
          {otherAbsences.length === 0 ? (
            <p className="muted">{t("hr.noAbsences")}</p>
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>{t("field.type")}</th>
                    <th>{t("field.from")}</th>
                    <th>{t("field.to")}</th>
                    <th>{t("field.reason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {otherAbsences.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Pill tone={a.type === "INJUSTIFIEE" ? "danger" : "warn"}>{t(ABSENCE_TYPE_LABELS[a.type])}</Pill>
                      </td>
                      <td className="tabular">{formatDate(a.startDate)}</td>
                      <td className="tabular">{formatDate(a.endDate)}</td>
                      <td>{a.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="batch-meta-item">
      <span className="batch-meta-label">{label}</span>
      <span className="batch-meta-value">{value}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="detail-field">
      <span className="field-label">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}
