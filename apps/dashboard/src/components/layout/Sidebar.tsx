import {
  LayoutDashboard,
  Package,
  Factory,
  ShoppingCart,
  Receipt,
  Users,
  Wallet,
  Moon,
  UserCog,
  History,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "../../lib/authApi";
import type { TranslationKey } from "../../lib/i18n";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";

export type TabId = "dashboard" | "stock" | "production" | "purchasing" | "orders" | "hr" | "finance" | "zakati" | "users" | "audit";

interface NavItem {
  id: TabId;
  /** Translation key, resolved at render so the sidebar follows the language toggle. */
  label: TranslationKey;
  icon: LucideIcon;
  /**
   * The permission(s) that reveal this tab. Undefined means any logged-in
   * user can see it; an array means any one of them is enough (used by tabs
   * that fold together more than one permission domain, e.g. Achats &
   * fournisseurs). Hiding a tab is a convenience — the backend refuses the
   * request regardless (build plan Phase 2).
   */
  permission?: Permission | Permission[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { id: "stock", label: "nav.stock", icon: Package, permission: "stock:read" },
  { id: "production", label: "nav.production", icon: Factory, permission: "production:read" },
  { id: "purchasing", label: "nav.purchasing", icon: ShoppingCart, permission: ["purchasing:read", "suppliers:read"] },
  { id: "orders", label: "nav.orders", icon: Receipt, permission: "orders:read" },
  { id: "hr", label: "nav.hr", icon: Users, permission: "hr:read" },
  { id: "finance", label: "nav.finance", icon: Wallet, permission: "finance:read" },
  { id: "zakati", label: "nav.zakati", icon: Moon, permission: "finance:read" },
  { id: "users", label: "nav.users", icon: UserCog, permission: "users:manage" },
  { id: "audit", label: "nav.audit", icon: History, permission: "audit:read" },
];

/**
 * Purely presentational — groups the same NAV_ITEMS into labelled sections
 * for the sidebar. visibleTabs() below still works off the flat list, so
 * this has no bearing on what a role can reach, only on how it's grouped.
 */
const NAV_GROUPS: Array<{ label: TranslationKey; items: TabId[] }> = [
  { label: "nav.group.general", items: ["dashboard"] },
  { label: "nav.group.inventory", items: ["stock"] },
  { label: "nav.group.production", items: ["production"] },
  { label: "nav.group.sales", items: ["orders"] },
  { label: "nav.group.purchasing", items: ["purchasing"] },
  { label: "nav.group.hrFinance", items: ["hr", "finance", "zakati"] },
  { label: "nav.group.admin", items: ["users", "audit"] },
];

function allowed(item: NavItem, canAny: (...permissions: Permission[]) => boolean): boolean {
  if (!item.permission) return true;
  return Array.isArray(item.permission) ? canAny(...item.permission) : canAny(item.permission);
}

/** The tabs this user is allowed to see, in order. */
export function visibleTabs(canAny: (...permissions: Permission[]) => boolean): TabId[] {
  return NAV_ITEMS.filter((item) => allowed(item, canAny)).map((item) => item.id);
}

export function Sidebar({ active, onNavigate }: { active: TabId; onNavigate: (tab: TabId) => void }) {
  const { canAny } = useAuth();
  const { t } = useI18n();
  const visible = new Set(NAV_ITEMS.filter((item) => allowed(item, canAny)).map((item) => item.id));
  const byId = new Map(NAV_ITEMS.map((item) => [item.id, item]));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-brand-mark" src="/logo.png" alt={t("brand.name")} />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">{t("brand.name")}</span>
          <span className="sidebar-brand-tagline">{t("brand.tagline")}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
          const groupItems = group.items.filter((id) => visible.has(id));
          if (groupItems.length === 0) return null;
          return (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{t(group.label)}</div>
              {groupItems.map((id) => {
                const item = byId.get(id)!;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link ${active === item.id ? "sidebar-link-active" : ""}`}
                    onClick={() => onNavigate(item.id)}
                  >
                    <item.icon className="sidebar-link-icon" size={17} strokeWidth={2} />
                    <span>{t(item.label)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-line sidebar-footer-muted">{t("brand.creditPrefix")}</span>
        <span className="sidebar-footer-line sidebar-footer-names">{t("brand.creditNames")}</span>
      </div>
    </aside>
  );
}
