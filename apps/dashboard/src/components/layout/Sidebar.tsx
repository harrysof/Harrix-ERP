import type { Permission } from "../../lib/authApi";
import { useAuth } from "../../state/AuthContext";

export type TabId = "dashboard" | "stock" | "production" | "orders" | "hr" | "suppliers" | "users" | "audit";

interface NavItem {
  id: TabId;
  label: string;
  /**
   * The permission that reveals this tab. Undefined means any logged-in user
   * can see it. Hiding a tab is a convenience — the backend refuses the
   * request regardless (build plan Phase 2).
   */
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "stock", label: "Stock", permission: "stock:read" },
  { id: "production", label: "Production", permission: "production:read" },
  { id: "orders", label: "Commandes & clients", permission: "orders:read" },
  { id: "hr", label: "Ressources humaines", permission: "hr:read" },
  { id: "suppliers", label: "Fournisseurs", permission: "suppliers:read" },
  { id: "users", label: "Utilisateurs", permission: "users:manage" },
  { id: "audit", label: "Journal d'activité", permission: "audit:read" },
];

/** The tabs this user is allowed to see, in order. */
export function visibleTabs(can: (permission: Permission) => boolean): TabId[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map((item) => item.id);
}

export function Sidebar({ active, onNavigate }: { active: TabId; onNavigate: (tab: TabId) => void }) {
  const { can } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

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
