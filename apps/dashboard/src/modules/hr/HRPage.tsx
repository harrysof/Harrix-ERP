import { useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { useLocalCollection } from "../../lib/useLocalCollection";
import { EmployeesPage } from "./EmployeesPage";
import { AttendancePage } from "./AttendancePage";
import type { Absence, Employee, TimeEntry } from "./types";

type Tab = "employees" | "attendance";

export function HRPage() {
  const [tab, setTab] = useState<Tab>("employees");
  const employees = useLocalCollection<Employee>("harrix.employees.v1");
  const timeEntries = useLocalCollection<TimeEntry>("harrix.time-entries.v1");
  const absences = useLocalCollection<Absence>("harrix.absences.v1");

  return (
    <div className="page-stack">
      <Banner tone="info">Les données RH (employés, heures, absences) sont enregistrées dans ce navigateur — pas de module backend RH pour l'instant.</Banner>

      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "employees" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("employees")}>
          Employés
        </button>
        <button type="button" className={`tab-strip-item ${tab === "attendance" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("attendance")}>
          Présence
        </button>
      </div>

      {tab === "employees" ? (
        <EmployeesPage employees={employees.items} add={employees.add} update={employees.update} />
      ) : (
        <AttendancePage employees={employees.items} timeEntries={timeEntries.items} addTimeEntry={timeEntries.add} absences={absences.items} addAbsence={absences.add} />
      )}
    </div>
  );
}
