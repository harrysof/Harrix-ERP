const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("fr-FR");

/** Accepts either a plain "YYYY-MM-DD" date or a full ISO datetime (as the backend returns). */
export function formatDate(iso: string): string {
  const value = iso.includes("T") ? iso : `${iso}T00:00:00`;
  return dateFormatter.format(new Date(value));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatQuantity(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

const currencyFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD", maximumFractionDigits: 2 });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}
