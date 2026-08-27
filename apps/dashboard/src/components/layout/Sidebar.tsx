export type TabId = "dashboard" | "stock";

interface NavItem {
  id: TabId | string;
  label: string;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", enabled: true },
  { id: "stock", label: "Stock", enabled: true },
  { id: "production", label: "Production", enabled: false },
  { id: "orders", label: "Commandes & clients", enabled: false },
  { id: "hr", label: "Ressources humaines", enabled: false },
  { id: "suppliers", label: "Fournisseurs", enabled: false },
  { id: "settings", label: "Paramètres", enabled: false },
];

export function Sidebar({ active, onNavigate }: { active: TabId; onNavigate: (tab: TabId) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">C</span>
        <span className="sidebar-brand-name">Chelma</span>
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
