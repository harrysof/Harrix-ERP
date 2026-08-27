import { useState } from "react";
import "./App.css";
import { InventoryTypesProvider } from "./state/InventoryTypesContext";
import { AppShell } from "./components/layout/AppShell";
import type { TabId } from "./components/layout/Sidebar";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { StockPage } from "./modules/stock/StockPage";
import { ProductionPage } from "./modules/production/ProductionPage";
import { OrdersPage } from "./modules/orders/OrdersPage";
import { HRPage } from "./modules/hr/HRPage";
import { SuppliersPage } from "./modules/suppliers/SuppliersPage";

const PAGE_COPY: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble de l'usine" },
  stock: { title: "Stock", subtitle: "Les 4 inventaires : produits chimiques, tige, pièces détachées, produits finis" },
  production: { title: "Production", subtitle: "Enregistrer un lot de production et réconcilier la sortie" },
  orders: { title: "Commandes & clients", subtitle: "Suivi des commandes et de la clientèle" },
  hr: { title: "Ressources humaines", subtitle: "Employés, heures travaillées et absences" },
  suppliers: { title: "Fournisseurs", subtitle: "Fournisseurs de matières premières et de pièces détachées" },
};

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const copy = PAGE_COPY[tab];

  return (
    <InventoryTypesProvider>
      <AppShell active={tab} onNavigate={setTab} title={copy.title} subtitle={copy.subtitle}>
        {tab === "dashboard" && <DashboardPage onGoToStock={() => setTab("stock")} />}
        {tab === "stock" && <StockPage />}
        {tab === "production" && <ProductionPage />}
        {tab === "orders" && <OrdersPage />}
        {tab === "hr" && <HRPage />}
        {tab === "suppliers" && <SuppliersPage />}
      </AppShell>
    </InventoryTypesProvider>
  );
}
