import { useState } from "react";
import { ZakatDashboardPage } from "./ZakatDashboardPage";
import { ZakatCalculationPage } from "./ZakatCalculationPage";
import { ZakatHistoryPage } from "./ZakatHistoryPage";

export type ZakatTab = "dashboard" | "calculation" | "history";

export function ZakatPage() {
  const [tab, setTab] = useState<ZakatTab>("dashboard");

  return (
    <div className="page-stack">
      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "dashboard" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("dashboard")}>
          Tableau de bord
        </button>
        <button type="button" className={`tab-strip-item ${tab === "calculation" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("calculation")}>
          Calcul de la Zakat
        </button>
        <button type="button" className={`tab-strip-item ${tab === "history" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("history")}>
          Historique
        </button>
      </div>

      {tab === "dashboard" ? <ZakatDashboardPage onNavigate={setTab} /> : null}
      {tab === "calculation" ? <ZakatCalculationPage onNavigate={setTab} /> : null}
      {tab === "history" ? <ZakatHistoryPage /> : null}
    </div>
  );
}
