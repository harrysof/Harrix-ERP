import type { ReactNode } from "react";
import { Sidebar, type TabId } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  active: TabId;
  onNavigate: (tab: TabId) => void;
  title: string;
  subtitle: string;
  onChangePassword: () => void;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, title, subtitle, onChangePassword, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar active={active} onNavigate={onNavigate} />
      <div className="app-main">
        <Topbar title={title} subtitle={subtitle} onChangePassword={onChangePassword} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
