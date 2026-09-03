import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

export function Topbar({ title, subtitle, onChangePassword }: { title: string; subtitle: string; onChangePassword: () => void }) {
  const { user, logout } = useAuth();
  const { locale, t } = useI18n();
  const dateFormatter = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        <p className="topbar-subtitle">{subtitle}</p>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">{dateFormatter.format(new Date())}</span>

        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell />

        <div className="user-menu" ref={menuRef}>
          <button type="button" className="topbar-user" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
            {initials(user?.fullName ?? "?")}
          </button>

          {open ? (
            <div className="user-menu-panel" role="menu">
              <div className="user-menu-header">
                <span className="user-menu-name">{user?.fullName}</span>
                <span className="user-menu-role">{user?.role.label}</span>
                <span className="user-menu-login">{user?.login}</span>
              </div>
              <button type="button" className="user-menu-item" onClick={() => { setOpen(false); onChangePassword(); }}>
                {t("user.changePassword")}
              </button>
              <button type="button" className="user-menu-item user-menu-item-danger" onClick={logout}>
                {t("user.logout")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
