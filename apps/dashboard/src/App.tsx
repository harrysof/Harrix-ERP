import { useEffect, useState } from "react";
import "./App.css";
import { InventoryTypesProvider } from "./state/InventoryTypesContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { ThemeProvider } from "./state/ThemeContext";
import { LanguageProvider, useI18n } from "./state/LanguageContext";
import type { TranslationKey } from "./lib/i18n";
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

/**
 * Each tab's heading. The title reuses the sidebar's nav label so the two can
 * never drift apart; the subtitle has its own key.
 */
const PAGE_COPY: Record<TabId, { title: TranslationKey; subtitle: TranslationKey }> = {
  dashboard: { title: "nav.dashboard", subtitle: "page.dashboard.subtitle" },
  stock: { title: "nav.stock", subtitle: "page.stock.subtitle" },
  production: { title: "nav.production", subtitle: "page.production.subtitle" },
  purchasing: { title: "nav.purchasing", subtitle: "page.purchasing.subtitle" },
  orders: { title: "nav.orders", subtitle: "page.orders.subtitle" },
  hr: { title: "nav.hr", subtitle: "page.hr.subtitle" },
  finance: { title: "nav.finance", subtitle: "page.finance.subtitle" },
  zakati: { title: "nav.zakati", subtitle: "page.zakati.subtitle" },
  users: { title: "nav.users", subtitle: "page.users.subtitle" },
  audit: { title: "nav.audit", subtitle: "page.audit.subtitle" },
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

/**
 * The login gate. Nothing below this point renders — and therefore nothing
 * fetches — until there is a real session, so a logged-out browser never
 * fires a request that would just 401.
 */
function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return <div className="boot-screen">{t("app.loading")}</div>;
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
  const { t } = useI18n();
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
      title={t(copy.title)}
      subtitle={t(copy.subtitle)}
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
