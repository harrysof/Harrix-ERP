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
import { PurchasingPage } from "./modules/purchasing/PurchasingPage";
import { SalesPage } from "./modules/sales/SalesPage";
import { HRPage } from "./modules/hr/HRPage";
import { FinancePage } from "./modules/finance/FinancePage";
import { ZakatPage } from "./modules/zakat/ZakatPage";
import { UsersPage } from "./modules/admin/UsersPage";
import { AuditPage } from "./modules/admin/AuditPage";

const PAGE_COPY: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: "Tableau de bord", subtitle: "Vue d'ensemble de l'usine" },
  stock: { title: "Stock", subtitle: "Les 4 inventaires : produits chimiques, tige, pièces détachées, produits finis" },
  production: { title: "Production", subtitle: "Lots de production, traçabilité des matières, écarts et pertes" },
  purchasing: { title: "Achats & fournisseurs", subtitle: "Fournisseur → bon de commande → réception → stock" },
  orders: { title: "Ventes & clients", subtitle: "Commandes, factures et base clients" },
  hr: { title: "Ressources humaines", subtitle: "Employés, heures travaillées et absences" },
  finance: { title: "Finance", subtitle: "Calculateur de coût de revient et de marge, produit par produit" },
  zakati: { title: "ZAKATI", subtitle: "Calcul, suivi et historique de la Zakat de l'entreprise" },
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
  const { can, canAny } = useAuth();
  const allowed = visibleTabs(canAny);
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
      {tab === "purchasing" && <PurchasingPage />}
      {tab === "orders" && <SalesPage />}
      {tab === "hr" && <HRPage />}
      {tab === "finance" && <FinancePage />}
      {tab === "zakati" && <ZakatPage />}
      {tab === "users" && <UsersPage />}
      {tab === "audit" && <AuditPage />}

      {changingPassword ? <ChangePasswordModal onClose={() => setChangingPassword(false)} /> : null}
    </AppShell>
  );
}
