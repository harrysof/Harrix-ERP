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

interface EmployeeDetailModalProps {
  employeeId: string;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (employee: ApiEmployee) => void;
}

function tenureLabel(t: ApiEmployeeDetail["tenure"]): string {
  if (t.totalDays === 0) return "Aujourd'hui";
  const parts: string[] = [];
  if (t.years > 0) parts.push(`${t.years} an${t.years > 1 ? "s" : ""}`);
  if (t.months > 0) parts.push(`${t.months} mois`);
  if (t.years === 0) parts.push(`${t.days} j`);
  return parts.join(" ");
}

/**
 * §HR's employee card — the "fiche" the stock module already has per item:
 * the profile, the payroll estimate it implies, and the recent ledgers
 * (hours, absences) that explain how it got there.
 */
export function EmployeeDetailModal({ employeeId, onClose, onChanged, onEdit }: EmployeeDetailModalProps) {
  const { can } = useAuth();
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
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger la fiche."))
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
      setError(e instanceof ApiError ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !employee) {
    return (
      <Modal title="Fiche employé" onClose={onClose} width={860}>
        {error ? <Banner tone="danger">{error}</Banner> : <p className="loading-text">Chargement…</p>}
      </Modal>
    );
  }

  const contractSoonEnding =
    employee.contractType === "CDD" && employee.contractEndDate && new Date(employee.contractEndDate) < new Date(Date.now() + 30 * 86_400_000);

  return (
    <Modal
      title={employee.fullName}
      subtitle={employee.position}
      onClose={onClose}
      width={860}
      footer={
        <>
          <Button onClick={onClose}>Fermer</Button>
          {canWrite ? (
            <>
              <Button onClick={() => onEdit(employee)}>Modifier</Button>
              <Button variant={employee.archived ? "secondary" : "danger"} onClick={toggleArchive} disabled={busy}>
                {employee.archived ? "Désarchiver" : "Archiver"}
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <div className="form-stack">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <div className="batch-meta">
          <Meta label="Statut" value={<Pill tone={employee.archived ? "neutral" : "ok"}>{employee.archived ? "Archivé" : "Actif"}</Pill>} />
          <Meta label="Contrat" value={CONTRACT_TYPE_LABELS[employee.contractType]} />
          <Meta label="Embauché le" value={formatDate(employee.hireDate)} />
          <Meta label="Ancienneté" value={tenureLabel(employee.tenure)} />
        </div>

        {employee.contractType === "CDD" && employee.contractEndDate ? (
          <Banner tone={contractSoonEnding ? "warn" : "info"}>
            Contrat à durée déterminée — fin le {formatDate(employee.contractEndDate)}
            {contractSoonEnding ? ". Moins de 30 jours restants." : "."}
          </Banner>
        ) : null}

        <div className="stat-grid">
          <StatCard label="Salaire brut" value={formatCurrency(employee.payEstimate.gross)} hint="Mensuel" />
          <StatCard label="CNAS salarié" value={formatCurrency(employee.payEstimate.cnas)} hint="9 % du brut" />
          <StatCard label="IRG estimé" value={formatCurrency(employee.payEstimate.irg)} hint="Estimation — voir avertissement" tone="warn" />
          <StatCard label="Net estimé" value={formatCurrency(employee.payEstimate.net)} hint="Brut − CNAS − IRG" />
        </div>

        <Banner tone="warn">
          L'IRG affiché est une <strong>estimation de planification</strong>, calculée par tranches sur le barème simplifié de
          2022, sans le lissage (décote) que la loi applique à l'entrée de chaque tranche. Vérifiez avec votre expert-comptable
          avant toute utilisation sur un bulletin de paie réel.
        </Banner>

        <section>
          <h4 className="section-title">Identité et administratif</h4>
          <div className="detail-grid">
            <DetailField label="Téléphone" value={employee.phone} />
            <DetailField label="Adresse" value={employee.address} />
            <DetailField label="Date de naissance" value={employee.birthDate ? formatDate(employee.birthDate) : null} />
            <DetailField label="NIN" value={employee.nin} />
            <DetailField label="N° CNAS" value={employee.cnasNumber} />
            <DetailField label="Situation familiale" value={employee.maritalStatus ? MARITAL_STATUS_LABELS[employee.maritalStatus] : null} />
            <DetailField label="Enfants à charge" value={String(employee.dependentChildren)} />
            <DetailField label="RIB" value={employee.bankRib} />
          </div>
        </section>

        {employee.emergencyContactName || employee.emergencyContactPhone ? (
          <section>
            <h4 className="section-title">Contact d'urgence</h4>
            <p className="batch-notes">
              {employee.emergencyContactName ?? "—"}
              {employee.emergencyContactPhone ? ` · ${employee.emergencyContactPhone}` : ""}
            </p>
          </section>
        ) : null}

        {employee.notes ? (
          <section>
            <h4 className="section-title">Notes</h4>
            <p className="batch-notes">{employee.notes}</p>
          </section>
        ) : null}

        <section>
          <h4 className="section-title">Heures récentes</h4>
          {employee.timeEntries.length === 0 ? (
            <p className="muted">Aucune heure enregistrée.</p>
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Heures</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.timeEntries.map((t) => (
                    <tr key={t.id}>
                      <td className="tabular">{formatDate(t.date)}</td>
                      <td className="tabular num">{t.hoursWorked}</td>
                      <td>{t.source === "device" ? "Pointeuse" : "Manuel"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h4 className="section-title">Absences récentes</h4>
          {employee.absences.length === 0 ? (
            <p className="muted">Aucune absence enregistrée.</p>
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Du</th>
                    <th>Au</th>
                    <th>Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.absences.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Pill tone={a.type === "INJUSTIFIEE" ? "danger" : a.type === "MALADIE" ? "warn" : "neutral"}>
                          {ABSENCE_TYPE_LABELS[a.type]}
                        </Pill>
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
