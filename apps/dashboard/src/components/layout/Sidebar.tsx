import {
  LayoutDashboard,
  Package,
  Factory,
  ShoppingCart,
  Receipt,
  Users,
  Wallet,
  UserCog,
  History,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "../../lib/authApi";
import { useAuth } from "../../state/AuthContext";

export type TabId = "dashboard" | "stock" | "production" | "purchasing" | "orders" | "hr" | "finance" | "users" | "audit";

interface NavItem {
  id: TabId;
  label: string;
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
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "stock", label: "Stock", icon: Package, permission: "stock:read" },
  { id: "production", label: "Production", icon: Factory, permission: "production:read" },
  { id: "purchasing", label: "Achats & fournisseurs", icon: ShoppingCart, permission: ["purchasing:read", "suppliers:read"] },
  { id: "orders", label: "Ventes & clients", icon: Receipt, permission: "orders:read" },
  { id: "hr", label: "Ressources humaines", icon: Users, permission: "hr:read" },
  { id: "finance", label: "Finance", icon: Wallet, permission: "finance:read" },
  { id: "users", label: "Utilisateurs", icon: UserCog, permission: "users:manage" },
  { id: "audit", label: "Journal d'activité", icon: History, permission: "audit:read" },
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
  const items = NAV_ITEMS.filter((item) => allowed(item, canAny));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-brand-mark" src="/logo.png" alt="Harrix ERP" />
        <span className="sidebar-brand-name">Harrix</span>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${active === item.id ? "sidebar-link-active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon className="sidebar-link-icon" size={17} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-line">Usine de chaussures</span>
        <span className="sidebar-footer-line sidebar-footer-muted">Alger, Algérie</span>
      </div>
    </aside>
  );
}
