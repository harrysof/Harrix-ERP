const dateFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  const today = dateFormatter.format(new Date());
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        <p className="topbar-subtitle">{subtitle}</p>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">{today}</span>
        <span className="topbar-user">G</span>
      </div>
    </header>
  );
}
