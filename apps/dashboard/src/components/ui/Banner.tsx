import type { ReactNode } from "react";

type Tone = "warn" | "danger" | "info";

export function Banner({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`banner banner-${tone}`}>{children}</div>;
}
