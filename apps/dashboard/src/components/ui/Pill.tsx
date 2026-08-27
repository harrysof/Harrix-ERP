import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "neutral";

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
