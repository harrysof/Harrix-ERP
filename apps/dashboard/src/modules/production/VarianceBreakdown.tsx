import { formatNumber } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";

interface VarianceBreakdownProps {
  expectedQuantity: number;
  firstChoice: number;
  secondChoice: number;
  waste: number;
  unit?: string;
}

/**
 * The formula, shown as a formula:
 *
 *   Attendu − 1er choix − 2ème choix − Rebut = Non comptabilisé
 *
 * Spelling it out is the point. The factory's complaint was that losses
 * disappear inside one final quantity, so the arithmetic is displayed rather
 * than just its result, and the wording stays operational — "non
 * comptabilisé", never "volé".
 */
export function VarianceBreakdown({ expectedQuantity, firstChoice, secondChoice, waste, unit }: VarianceBreakdownProps) {
  const { t } = useI18n();
  const accounted = firstChoice + secondChoice + waste;
  const unknown = Math.round((expectedQuantity - accounted) * 100) / 100;

  return (
    <div className="variance-strip">
      <Term label={t("prod.expectedMachine")} value={expectedQuantity} unit={unit} />
      <Operator>−</Operator>
      <Term label={t("quality.first")} value={firstChoice} />
      <Operator>−</Operator>
      <Term label={t("quality.second")} value={secondChoice} />
      <Operator>−</Operator>
      <Term label={t("quality.reject")} value={waste} />
      <Operator>=</Operator>
      <Term label={t("prod.col.unknown")} value={unknown} tone={unknown === 0 ? "ok" : "danger"} />
    </div>
  );
}

function Term({ label, value, unit, tone = "neutral" }: { label: string; value: number; unit?: string; tone?: "neutral" | "ok" | "danger" }) {
  return (
    <div className={`variance-term variance-term-${tone}`}>
      <span className="variance-term-label">{label}</span>
      <span className="variance-term-value tabular">
        {formatNumber(value)}
        {unit ? <span className="variance-term-unit"> {unit}</span> : null}
      </span>
    </div>
  );
}

function Operator({ children }: { children: string }) {
  return (
    <span className="variance-operator" aria-hidden="true">
      {children}
    </span>
  );
}
