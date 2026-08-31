import { useCallback, useEffect, useMemo, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { archiveEmployee, CONTRACT_TYPE_LABELS, fetchEmployees, unarchiveEmployee, type ApiEmployee } from "../../lib/hrApi";
import { useAuth } from "../../state/AuthContext";
import { EmployeeModal } from "./EmployeeModal";
import { EmployeeDetailModal } from "./EmployeeDetailModal";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; employee: ApiEmployee } | { kind: "detail"; employeeId: string };

/** Ancienneté, rendered the way a factory actually says it. */
function tenureLabel(t: ApiEmployee["tenure"]): string {
  if (t.totalDays === 0) return "Aujourd'hui";
  const parts: string[] = [];
  if (t.years > 0) parts.push(`${t.years} an${t.years > 1 ? "s" : ""}`);
  if (t.months > 0) parts.push(`${t.months} mois`);
  if (t.years === 0 && t.months === 0) parts.push(`${t.days} j`);
  return parts.join(" ");
}

export function EmployeesPage() {
  const { can } = useAuth();
  const canWrite = can("hr:write");
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchEmployees({ includeArchived: true })
      .then(setEmployees)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les employés."))
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

  async function toggleArchive(employee: ApiEmployee) {
    try {
      if (employee.archived) await unarchiveEmployee(employee.id);
      else await archiveEmployee(employee.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action impossible.");
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder="Rechercher un employé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="toolbar-actions">
          <label className="checkbox-row" style={{ margin: 0 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            <span>Afficher les archivés</span>
          </label>
          {canWrite ? (
            <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
              + Nouvel employé
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? "Aucun employé ne correspond à la recherche" : "Aucun employé enregistré"}
          action={
            !search && canWrite ? (
              <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
                + Nouvel employé
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Poste</th>
                <th>Contrat</th>
                <th>Embauché le</th>
                <th>Ancienneté</th>
                <th className="num">Salaire brut</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className={e.archived ? "row-muted" : undefined}>
                  <td>
                    <button type="button" className="link-button" onClick={() => setModal({ kind: "detail", employeeId: e.id })}>
                      {e.fullName}
                    </button>
                  </td>
                  <td>{e.position}</td>
                  <td>{CONTRACT_TYPE_LABELS[e.contractType]}</td>
                  <td className="tabular">{formatDate(e.hireDate)}</td>
                  <td className="tabular">{tenureLabel(e.tenure)}</td>
                  <td className="tabular num">{formatCurrency(e.salary)}</td>
                  <td>
                    <Pill tone={e.archived ? "neutral" : "ok"}>{e.archived ? "Archivé" : "Actif"}</Pill>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button variant="ghost" onClick={() => setModal({ kind: "detail", employeeId: e.id })}>
                        Fiche
                      </Button>
                      {canWrite ? (
                        <>
                          <Button variant="secondary" onClick={() => setModal({ kind: "edit", employee: e })}>
                            Modifier
                          </Button>
                          <Button variant="ghost" onClick={() => toggleArchive(e)}>
                            {e.archived ? "Désarchiver" : "Archiver"}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
