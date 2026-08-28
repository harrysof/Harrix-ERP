import { useEffect, useState } from "react";
import "./App.css";
import { InventoryTypesProvider } from "./state/InventoryTypesContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { visibleTabs, type TabId } from "./components/layout/Sidebar";
import { LoginPage } from "./modules/auth/LoginPage";
import { ChangePasswordModal } from "./modules/auth/ChangePasswordModal";
import { DashboardPage } from "./modules/dashboard/DashboardPage";
import { StockPage } from "./modules/stock/StockPage";
import { ProductionPage } from "./modules/production/ProductionPage";
import { OrdersPage } from "./modules/orders/OrdersPage";
import { HRPage } from "./modules/hr/HRPage";
import { SuppliersPage } from "./modules/suppliers/SuppliersPage";
import { UsersPage } from "./modules/admin/UsersPage";
import { AuditPage } from "./modules/admin/AuditPage";

const PAGE_COPY: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble de l'usine" },
  stock: { title: "Stock", subtitle: "Les 4 inventaires : produits chimiques, tige, pièces détachées, produits finis" },
  production: { title: "Production", subtitle: "Lots de production, traçabilité des matières, écarts et pertes" },
  orders: { title: "Commandes & clients", subtitle: "Suivi des commandes et de la clientèle" },
  hr: { title: "Ressources humaines", subtitle: "Employés, heures travaillées et absences" },
  suppliers: { title: "Fournisseurs", subtitle: "Fournisseurs de matières premières et de pièces détachées" },
  users: { title: "Utilisateurs", subtitle: "Comptes, rôles et permissions" },
  audit: { title: "Journal d'activité", subtitle: "Qui a fait quoi, et quand" },
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

/**
 * The login gate. Nothing below this point renders — and therefore nothing
 * fetches — until there is a real session, so a logged-out browser never
 * fires a request that would just 401.
 */
function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) return <div className="boot-screen">Chargement…</div>;
  if (!user) return <LoginPage />;

  // Keyed on the user id so switching accounts remounts everything: no page
  // keeps data fetched under the previous person's permissions.
  return (
    <InventoryTypesProvider key={user.id}>
      <MainApp />
    </InventoryTypesProvider>
  );
}

function MainApp() {
  const { can } = useAuth();
  const allowed = visibleTabs(can);
  const [tab, setTab] = useState<TabId>(allowed[0] ?? "dashboard");
  const [changingPassword, setChangingPassword] = useState(false);

  // If the gérant changes someone's role while they're using the app, the tab
  // they're on can vanish from under them. Fall back rather than render a
  // page they can no longer load.
  useEffect(() => {
    if (!allowed.includes(tab)) setTab(allowed[0] ?? "dashboard");
  }, [allowed, tab]);

  const copy = PAGE_COPY[tab];

  return (
    <AppShell
      active={tab}
      onNavigate={setTab}
      title={copy.title}
      subtitle={copy.subtitle}
      onChangePassword={() => setChangingPassword(true)}
    >
      {tab === "dashboard" && <DashboardPage onGoToStock={() => can("stock:read") && setTab("stock")} />}
      {tab === "stock" && <StockPage />}
      {tab === "production" && <ProductionPage />}
      {tab === "orders" && <OrdersPage />}
      {tab === "hr" && <HRPage />}
      {tab === "suppliers" && <SuppliersPage />}
      {tab === "users" && <UsersPage />}
      {tab === "audit" && <AuditPage />}

      {changingPassword ? <ChangePasswordModal onClose={() => setChangingPassword(false)} /> : null}
    </AppShell>
  );
}
