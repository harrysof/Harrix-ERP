import { useState } from "react";
import { ZakatDashboardPage } from "./ZakatDashboardPage";
import { ZakatCalculationPage } from "./ZakatCalculationPage";
import { ZakatHistoryPage } from "./ZakatHistoryPage";
import { useI18n } from "../../state/LanguageContext";

export type ZakatTab = "dashboard" | "calculation" | "history";

export function ZakatPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<ZakatTab>("dashboard");

  return (
    <div className="page-stack">
      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "dashboard" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("dashboard")}>
          {t("zk.tabDashboard")}
        </button>
        <button type="button" className={`tab-strip-item ${tab === "calculation" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("calculation")}>
          {t("zk.tabCalculation")}
        </button>
        <button type="button" className={`tab-strip-item ${tab === "history" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("history")}>
          {t("zk.tabHistory")}
        </button>
      </div>

      {tab === "dashboard" ? <ZakatDashboardPage onNavigate={setTab} /> : null}
      {tab === "calculation" ? <ZakatCalculationPage onNavigate={setTab} /> : null}
      {tab === "history" ? <ZakatHistoryPage /> : null}
    </div>
  );
}
