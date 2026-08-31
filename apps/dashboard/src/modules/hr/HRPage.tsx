import { useState } from "react";
import { EmployeesPage } from "./EmployeesPage";
import { AttendancePage } from "./AttendancePage";

type Tab = "employees" | "attendance";

export function HRPage() {
  const [tab, setTab] = useState<Tab>("employees");

  return (
    <div className="page-stack">
      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "employees" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("employees")}>
          Employés
        </button>
        <button type="button" className={`tab-strip-item ${tab === "attendance" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("attendance")}>
          Présence
        </button>
      </div>

      {tab === "employees" ? <EmployeesPage /> : <AttendancePage />}
    </div>
  );
}
