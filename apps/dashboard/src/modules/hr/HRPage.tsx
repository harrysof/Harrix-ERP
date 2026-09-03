import { useState } from "react";
import { EmployeesPage } from "./EmployeesPage";
import { AttendancePage } from "./AttendancePage";
import { useI18n } from "../../state/LanguageContext";

type Tab = "employees" | "attendance";

export function HRPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("employees");

  return (
    <div className="page-stack">
      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "employees" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("employees")}>
          {t("hr.tabEmployees")}
        </button>
        <button type="button" className={`tab-strip-item ${tab === "attendance" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("attendance")}>
          {t("hr.tabAttendance")}
        </button>
      </div>

      {tab === "employees" ? <EmployeesPage /> : <AttendancePage />}
    </div>
  );
}
