import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { newId } from "../../lib/id";
import { formatCurrency, formatDate } from "../../lib/format";
import { EmployeeModal } from "./EmployeeModal";
import type { Employee } from "./types";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; employee: Employee };

interface EmployeesPageProps {
  employees: Employee[];
  add: (employee: Employee) => void;
  update: (id: string, patch: Partial<Employee>) => void;
}

export function EmployeesPage({ employees, add, update }: EmployeesPageProps) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees
      .filter((e) => !query || e.fullName.toLowerCase().includes(query) || e.position.toLowerCase().includes(query))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
  }, [employees, search]);

  return (
    <div className="page-stack">
      <div className="toolbar">
        <input className="input toolbar-search" placeholder="Rechercher un employé…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
          + Nouvel employé
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={search ? "Aucun employé ne correspond à la recherche" : "Aucun employé enregistré"}
          action={
            !search ? (
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
                <th>Téléphone</th>
                <th>Embauché le</th>
                <th>Salaire</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td>{e.fullName}</td>
                  <td>{e.position}</td>
                  <td className="tabular">{e.phone || "—"}</td>
                  <td className="tabular">{formatDate(e.hireDate)}</td>
                  <td className="tabular">{formatCurrency(e.salary)}</td>
                  <td>
                    <Button variant="secondary" onClick={() => setModal({ kind: "edit", employee: e })}>
                      Modifier
                    </Button>
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
          onSubmit={(input) => {
            add({ id: newId("emp"), ...input, createdAt: new Date().toISOString() });
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "edit" && (
        <EmployeeModal
          employee={modal.employee}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            update(modal.employee.id, input);
            setModal({ kind: "none" });
          }}
        />
      )}
    </div>
  );
}
