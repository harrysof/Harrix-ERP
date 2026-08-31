import { useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatCurrency, formatNumber } from "../../lib/format";
import { formatRate, type FinanceOverview, type ProductCosting } from "../../lib/financeApi";
import { useAuth } from "../../state/AuthContext";

interface PricingPanelProps {
  overview: FinanceOverview;
  onEditSettings: () => void;
  onEditMargin: (product: ProductCosting) => void;
}

/** "—" for an unknown figure. Never 0: they mean different things. */
function money(value: number | null): string {
  return value === null ? "—" : formatCurrency(value);
}

/**
 * What one finished product costs, and what it should therefore sell for.
 *
 * The table is deliberately laid out as an addition the reader can follow —
 * matières + directs + quote-part = coût de revient — because the last term
 * is a judgement call and hiding it inside a total would make the whole
 * number untrustworthy.
 */
export function PricingPanel({ overview, onEditSettings, onEditMargin }: PricingPanelProps) {
  const { can } = useAuth();
  const canManage = can("finance:manage");
  const [openId, setOpenId] = useState<string | null>(null);

  const { allocation, products, settings } = overview;
  const priced = products.filter((p) => p.unitCost !== null);
  const underMargin = priced.filter(
    (p) => p.currentMarkup !== null && p.currentMarkup < (p.marginIsOverride ? p.margin : settings.defaultMargin),
  );

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <StatCard
          label="Produits chiffrés"
          value={`${priced.length} / ${products.length}`}
          hint="Un coût de revient exige une production déclarée sur la période"
        />
        <StatCard
          label="Unités produites"
          value={formatNumber(overview.production.totalUnits)}
          hint={`${overview.production.batchCount} lot(s) déclaré(s)`}
        />
        <StatCard
          label="Charges à répartir"
          value={formatCurrency(allocation.pool)}
          hint="Indirectes, plus les directes non rattachées"
        />
        <StatCard
          label="Sous la marge visée"
          value={underMargin.length}
          hint={`Marge de l'usine : ${formatRate(settings.defaultMargin)}`}
          tone={underMargin.length > 0 ? "warn" : "ok"}
        />
      </div>

      {overview.warnings.map((w, index) => (
        <Banner key={`${w.code}-${index}`} tone={w.code === "MATERIALS_OVERRIDDEN" ? "info" : "warn"}>
          {w.message}
        </Banner>
      ))}

      <div className="allocation-card">
        <div>
          <span className="field-label">Répartition des charges indirectes</span>
          <p className="allocation-formula">
            {allocation.ratePerUnitOfBasis !== null ? (
              <>
                {formatCurrency(allocation.pool)} ÷ {formatNumber(allocation.divisor)} {allocation.divisorLabel} ={" "}
                <strong>{formatCurrency(allocation.ratePerUnitOfBasis)}</strong>
                {allocation.basis === "UNITS" ? " par unité produite" : " par DZD de matière"}
              </>
            ) : (
              <>Aucune répartition possible : la base ({allocation.divisorLabel}) vaut zéro sur cette période.</>
            )}
          </p>
          <span className="field-hint">{allocation.basisLabel}</span>
        </div>
        {canManage ? (
          <Button variant="ghost" onClick={onEditSettings}>
            Marge et répartition
          </Button>
        ) : null}
      </div>

      <Banner tone="warn">
        Le coût de revient ci-dessous n'est <strong>complet que si le registre l'est</strong>. Il additionne les matières
        réellement consommées, les charges que le comptable a saisies pour la période, et rien d'autre : ni impôts, ni TVA, ni
        frais financiers, ni ce qui n'a pas encore été enregistré. C'est une estimation pour décider d'un prix, pas un résultat
        comptable.
      </Banner>

      {products.length === 0 ? (
        <EmptyState
          title="Aucun produit fini à chiffrer"
          description="Les produits chiffrés ici sont ceux d'un inventaire qui porte un prix de vente, ou ceux qu'un lot de production a fabriqués sur la période."
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th className="num">Produites</th>
                <th className="num">Matières / u.</th>
                <th className="num">Directs / u.</th>
                <th className="num">Quote-part / u.</th>
                <th className="num">Coût de revient</th>
                <th className="num">Marge</th>
                <th className="num">Prix conseillé</th>
                <th className="num">Prix actuel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const open = openId === p.productItemId;
                const target = p.margin;
                const below = p.currentMarkup !== null && p.currentMarkup < target;
                const above = p.currentMarkup !== null && p.currentMarkup >= target;

                return [
                  <tr key={p.productItemId} className={p.unitCost === null ? "row-muted" : undefined}>
                    <td>
                      <button type="button" className="link-cell" onClick={() => setOpenId(open ? null : p.productItemId)}>
                        <strong>{p.name}</strong>
                      </button>
                      <span className="cell-note">{p.reference}</span>
                    </td>
                    <td className="num">{p.unitsProduced > 0 ? formatNumber(p.unitsProduced) : "—"}</td>
                    <td className="num">{money(p.materialUnitCost)}</td>
                    <td className="num">{money(p.directUnitCost)}</td>
                    <td className="num">{money(p.indirectUnitCost)}</td>
                    <td className="num">
                      <strong>{money(p.unitCost)}</strong>
                    </td>
                    <td className="num">
                      {formatRate(target)}
                      {p.marginIsOverride ? <span className="cell-sub">propre au produit</span> : null}
                    </td>
                    <td className="num">
                      <strong>{money(p.suggestedPrice)}</strong>
                    </td>
                    <td className="num">
                      {money(p.currentPrice)}
                      {p.currentMarkup !== null ? (
                        <span className="cell-sub">
                          <Pill tone={below ? "warn" : "ok"}>{formatRate(p.currentMarkup)}</Pill>
                        </span>
                      ) : null}
                    </td>
                    <td className="row-actions">
                      {canManage ? (
                        <Button variant="ghost" onClick={() => onEditMargin(p)}>
                          Marge
                        </Button>
                      ) : null}
                    </td>
                  </tr>,

                  open ? (
                    <tr key={`${p.productItemId}-detail`} className="row-child">
                      <td colSpan={10}>
                        <div className="cost-breakdown">
                          <div className="cost-breakdown-terms">
                            <Term label="Coût matières" value={p.materialUnitCost} note="Consommation réelle des lots" />
                            <Term label="+ Coûts directs" value={p.directUnitCost} note="Charges rattachées à ce produit" />
                            <Term
                              label="+ Quote-part indirecte"
                              value={p.indirectUnitCost}
                              note={
                                allocation.ratePerUnitOfBasis !== null
                                  ? `${formatCurrency(allocation.pool)} ÷ ${formatNumber(allocation.divisor)} ${allocation.divisorLabel}`
                                  : "Base de répartition nulle"
                              }
                            />
                            <Term label="= Coût de revient" value={p.unitCost} note="Par unité vendable" strong />
                          </div>

                          <div className="cost-breakdown-totals">
                            <p>
                              Sur la période : <strong>{formatNumber(p.unitsProduced)}</strong> unité(s) vendable(s),{" "}
                              <strong>{money(p.materialCost)}</strong> de matières,{" "}
                              <strong>{formatCurrency(p.directCost)}</strong> de charges directes,{" "}
                              <strong>{money(p.indirectShare)}</strong> de quote-part.
                            </p>
                            {p.currentPrice !== null && p.unitCost !== null ? (
                              <p>
                                Vendu {formatCurrency(p.currentPrice)} pour {formatCurrency(p.unitCost)} de coût :{" "}
                                <strong>{formatRate(p.currentMarkup)}</strong> de marge sur le coût, soit{" "}
                                <strong>{formatRate(p.currentMarginOnPrice)}</strong> du prix de vente.{" "}
                                {above ? "Au-dessus de la marge visée." : "En dessous de la marge visée."}
                              </p>
                            ) : null}
                            {p.warnings.map((w) => (
                              <p key={w.code} className="cell-note cell-note-warn">
                                {w.message}
                              </p>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Term({
  label,
  value,
  note,
  strong,
}: {
  label: string;
  value: number | null;
  note: string;
  strong?: boolean;
}) {
  return (
    <div className={`cost-term ${strong ? "cost-term-total" : ""}`.trim()}>
      <span className="cost-term-label">{label}</span>
      <span className="cost-term-value">{money(value)}</span>
      <span className="cost-term-note">{note}</span>
    </div>
  );
}
