import { useState } from "react";
import { MarginCalculatorPage } from "./MarginCalculatorPage";
import { FactoryCostsPage } from "./FactoryCostsPage";

type Tab = "calculator" | "costs";

export function FinancePage() {
  const [tab, setTab] = useState<Tab>("calculator");

  return (
    <div className="page-stack">
      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "calculator" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("calculator")}>
          Calculateur de marge
        </button>
        <button type="button" className={`tab-strip-item ${tab === "costs" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("costs")}>
          Coûts d'usine
        </button>
      </div>

      {tab === "calculator" ? <MarginCalculatorPage /> : <FactoryCostsPage />}
    </div>
  );
}
