export type TabId = "dashboard" | "stock" | "production" | "orders" | "hr" | "suppliers";

interface NavItem {
  id: TabId | string;
  label: string;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", enabled: true },
  { id: "stock", label: "Stock", enabled: true },
  { id: "production", label: "Production", enabled: true },
  { id: "orders", label: "Commandes & clients", enabled: true },
  { id: "hr", label: "Ressources humaines", enabled: true },
  { id: "suppliers", label: "Fournisseurs", enabled: true },
  { id: "settings", label: "Paramètres", enabled: false },
];

export function Sidebar({ active, onNavigate }: { active: TabId; onNavigate: (tab: TabId) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-brand-mark" src="/logo.png" alt="Harrix ERP" />
        <span className="sidebar-brand-name">Harrix</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${active === item.id ? "sidebar-link-active" : ""}`}
            disabled={!item.enabled}
            title={item.enabled ? undefined : "Ce module arrive dans une prochaine phase"}
            onClick={() => item.enabled && onNavigate(item.id as TabId)}
          >
            <span>{item.label}</span>
            {!item.enabled ? <span className="sidebar-soon">bientôt</span> : null}
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
