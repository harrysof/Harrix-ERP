import { useState } from "react";
import { MarginCalculatorPage } from "./MarginCalculatorPage";
import { FactoryCostsPage } from "./FactoryCostsPage";
import { useI18n } from "../../state/LanguageContext";

type Tab = "calculator" | "costs";

export function FinancePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("calculator");

  return (
    <div className="page-stack">
      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "calculator" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("calculator")}>
          {t("fin.tabCalculator")}
        </button>
        <button type="button" className={`tab-strip-item ${tab === "costs" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("costs")}>
          {t("fin.tabCosts")}
        </button>
      </div>

      {tab === "calculator" ? <MarginCalculatorPage /> : <FactoryCostsPage />}
    </div>
  );
}
