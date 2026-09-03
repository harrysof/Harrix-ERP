import { formatCurrency, formatPercent } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";

/**
 * §16/§17's totals block: subtotal, shipping, discount, tax, total.
 * Shared between the order form (live preview) and the invoice view (saved
 * figures from the server), so the two always read identically.
 */
export function OrderTotalsPanel({
  totals,
}: {
  totals: {
    subtotal: number;
    lineDiscounts?: number;
    shipping: number;
    discount: number;
    discountType?: "FIXED" | "PERCENT";
    discountRate?: number;
    taxRate?: number;
    tax: number;
    total: number;
  };
}) {
  const { t } = useI18n();
  const taxLabel =
    totals.taxRate != null && totals.taxRate > 0
      ? t("totals.taxPercent", { rate: formatPercent(totals.taxRate) })
      : t("totals.tax");
  const discountLabel =
    totals.discountType === "PERCENT" && totals.discountRate
      ? t("totals.discountPercent", { rate: formatPercent(totals.discountRate) })
      : t("totals.discount");
  return (
    <div className="totals-panel">
      <Row label={t("totals.subtotal")} value={totals.subtotal} />
      {totals.lineDiscounts ? <Row label={t("totals.lineDiscounts")} value={-totals.lineDiscounts} muted /> : null}
      <Row label={t("totals.shipping")} value={totals.shipping} />
      <Row label={discountLabel} value={-totals.discount} />
      <Row label={taxLabel} value={totals.tax} />
      <Row label={t("totals.total")} value={totals.total} strong />
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
