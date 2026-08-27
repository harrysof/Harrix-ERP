import { useState } from "react";
import "./App.css";
import { StockProvider } from "./state/StockContext";
import { AppShell } from "./components/layout/AppShell";
import type { TabId } from "./components/layout/Sidebar";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { StockPage } from "./modules/stock/StockPage";

const PAGE_COPY: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble de l'usine" },
  stock: { title: "Stock", subtitle: "Les 4 inventaires : produits chimiques, tige, pièces détachées, produits finis" },
};

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const copy = PAGE_COPY[tab];

  return (
    <StockProvider>
      <AppShell active={tab} onNavigate={setTab} title={copy.title} subtitle={copy.subtitle}>
        {tab === "dashboard" ? <DashboardPage onGoToStock={() => setTab("stock")} /> : <StockPage />}
      </AppShell>
    </StockProvider>
  );
}
