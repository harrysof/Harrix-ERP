/** A palette of soft tinted circles — cycled deterministically by name, not random, so the same person always gets the same color. */
const PALETTE = ["avatar-blue", "avatar-amber", "avatar-green", "avatar-pink", "avatar-purple", "avatar-teal"];

function colorClassFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** A colored initials circle for a person or company name — same treatment everywhere a name needs a face. */
export function Avatar({ name }: { name: string }) {
  return <span className={`avatar ${colorClassFor(name)}`}>{initialsOf(name)}</span>;
}
