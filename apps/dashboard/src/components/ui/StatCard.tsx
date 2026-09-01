import type { ComponentType, ReactNode } from "react";

type Tone = "neutral" | "ok" | "warn" | "danger";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
  placeholder?: boolean;
  /** A lucide icon component, shown in a tone-tinted circle above the label. */
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
}

export function StatCard({ label, value, hint, tone = "neutral", onClick, placeholder, icon: Icon }: StatCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      className={`stat-card stat-card-${tone} ${placeholder ? "stat-card-placeholder" : ""} ${onClick ? "stat-card-clickable" : ""}`.trim()}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      {Icon ? (
        <span className="stat-card-icon">
          <Icon size={19} strokeWidth={2} />
        </span>
      ) : null}
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
      {hint ? <span className="stat-card-hint">{hint}</span> : null}
    </Comp>
  );
}
