import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchAuditNotifications, type AuditEntry } from "../../lib/authApi";
import { ACTION_LABELS, ACTION_TONES, entityLabel } from "../../lib/auditLabels";
import { useAuth } from "../../state/AuthContext";
import { Pill } from "../ui/Pill";

const POLL_MS = 60_000;

function seenKey(userId: string): string {
  return `harrix.notifications-seen.${userId}`;
}

function readLastSeen(userId: string): number {
  try {
    return Number(localStorage.getItem(seenKey(userId))) || 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(userId: string, at: number) {
  try {
    localStorage.setItem(seenKey(userId), String(at));
  } catch {
    // Fine to lose the read marker; worst case the badge reappears next load.
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

/**
 * The topbar bell: a live feed of what other people just did, scoped to
 * what this user's role can see (the backend does the actual filtering —
 * see audit.service.ts's notifications). Never shows the viewer their own
 * actions, and never the account-security entries reserved for the full
 * journal (audit:read).
 */
export function NotificationBell() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => (user ? readLastSeen(user.id) : 0));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => fetchAuditNotifications().then((next) => !cancelled && setEntries(next)).catch(() => undefined);
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
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

  if (!user) return null;

  const unreadCount = entries.filter((e) => new Date(e.createdAt).getTime() > lastSeen).length;

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next && user) {
        const now = Date.now();
        writeLastSeen(user.id, now);
        setLastSeen(now);
      }
      return next;
    });
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button type="button" className="topbar-icon-button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label="Notifications">
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-panel" role="menu">
          <div className="notification-panel-header">Activité récente</div>
          {entries.length === 0 ? (
            <p className="notification-empty">Rien de nouveau pour l'instant.</p>
          ) : (
            <ul className="notification-list">
              {entries.map((entry) => (
                <li key={entry.id} className="notification-item">
                  <Pill tone={ACTION_TONES[entry.action] ?? "neutral"}>{ACTION_LABELS[entry.action] ?? entry.action}</Pill>
                  <div className="notification-item-body">
                    <span className="notification-item-title">{entityLabel(entry.entity)}</span>
                    <span className="notification-item-meta">
                      {entry.user?.fullName ?? entry.userLogin} · {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
