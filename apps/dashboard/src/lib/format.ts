const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("fr-FR");

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso + "T00:00:00"));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatQuantity(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}
