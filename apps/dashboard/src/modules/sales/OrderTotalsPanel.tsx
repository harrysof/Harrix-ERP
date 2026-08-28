import { formatCurrency } from "../../lib/format";

/**
 * §16/§17's totals block: subtotal, shipping, discount, tax, total.
 * Shared between the order form (live preview) and the invoice view (saved
 * figures from the server), so the two always read identically.
 */
export function OrderTotalsPanel({
  totals,
}: {
  totals: { subtotal: number; lineDiscounts?: number; shipping: number; discount: number; tax: number; total: number };
}) {
  return (
    <div className="totals-panel">
      <Row label="Sous-total" value={totals.subtotal} />
      {totals.lineDiscounts ? <Row label="dont remises par ligne" value={-totals.lineDiscounts} muted /> : null}
      <Row label="Livraison" value={totals.shipping} />
      <Row label="Remise" value={-totals.discount} />
      <Row label="Taxe" value={totals.tax} />
      <Row label="Total" value={totals.total} strong />
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`totals-row ${strong ? "totals-row-strong" : ""} ${muted ? "totals-row-muted" : ""}`.trim()}>
      <span>{label}</span>
      <span className="tabular">{formatCurrency(value)}</span>
    </div>
  );
}
