import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Boxes, Coins, Minus, Package, TrendingUp, Users, Wallet } from "lucide-react";
import { ApiError } from "../../lib/api";
import { fetchDashboard, currentMonthKey, type AnalyticsDashboard } from "../../lib/analyticsApi";
import { Banner } from "../../components/ui/Banner";
import { Pill } from "../../components/ui/Pill";
import { Rich } from "../../components/ui/Rich";
import { formatCurrency, formatMonthYear, formatNumber, formatPercent, formatQuantity } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";
import {
  ChartEmpty,
  ChartLegend,
  CompositionBar,
  Meter,
  RankBars,
  ResultStrip,
  TrendChart,
  type RankRow,
} from "../../components/ui/charts";
import { MonthPicker } from "./MonthPicker";

/**
 * The tableau de bord: one month of the factory, on one page.
 *
 * Everything here comes from a single call to /analytics/dashboard, which
 * builds only the sections the caller's role may see and returns `null` for
 * the rest. So the layout below is written as a series of `section && (…)`
 * blocks: a magasinier gets stock and matières, the gérant gets all of it, and
 * neither sees a card explaining what they are missing.
 *
 * Two things on this page are deliberately NOT about the selected month, and
 * say so in their own headers: stock on hand and the Zakat position are
 * snapshots of right now. An append-only ledger cannot be rewound to what the
 * shelves held last March, and inventing that figure would be the one dishonest
 * number on the page.
 */
export function DashboardPage({ onGoToStock }: { onGoToStock: () => void }) {
  const { t, tn } = useI18n();
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboard(month)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : t("dash.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  if (error && !data) return <Banner tone="danger">{error}</Banner>;
  if (!data) return <p className="loading-text">{t("dash.loading")}</p>;

  const { result, trend, sales, stock, materials, costs, hr, zakat } = data;
  const deltas = trend?.deltas ?? null;
  const nothingVisible = !result && !sales && !stock && !materials && !costs && !hr && !zakat;

  return (
    <div className={`dashboard ${loading ? "dashboard-busy" : ""}`.trim()}>
      <div className="dashboard-toolbar">
        <div className="dashboard-toolbar-head">
          <h2 className="dashboard-month">{formatMonthYear(month)}</h2>
          <p className="dashboard-month-hint">{loading ? t("dash.updating") : t("dash.monthScope")}</p>
        </div>
        <MonthPicker month={month} availableMonths={data.availableMonths} onChange={setMonth} busy={loading} />
      </div>

      {error ? <Banner tone="warn">{error}</Banner> : null}

      {nothingVisible ? <Banner tone="info">{t("dash.noAccess")}</Banner> : null}

      {/* ------------------------------------------------------ headline KPIs */}
      {(result || sales) && (
        <section className="kpi-row">
          {sales ? (
            <Kpi
              icon={<TrendingUp size={18} strokeWidth={2} />}
              label={t("dash.kpi.revenue")}
              value={formatCurrency(sales.revenue)}
              hint={t("dash.kpi.revenueHint", {
                count: tn("dash.orderCount", sales.orderCount),
                average: formatCurrency(sales.averageOrderValue),
              })}
              delta={deltas?.revenue ?? null}
            />
          ) : null}
          {result ? (
            <Kpi
              icon={<Wallet size={18} strokeWidth={2} />}
              label={t("dash.kpi.costs")}
              value={formatCurrency(result.totalCost)}
              hint={t("dash.kpi.costsHint")}
              delta={deltas?.totalCost ?? null}
              upIsGood={false}
            />
          ) : null}
          {result ? (
            <Kpi
              hero
              icon={<Coins size={18} strokeWidth={2} />}
              label={t("dash.kpi.profit")}
              value={formatCurrency(result.profit)}
              hint={
                result.marginRate != null
                  ? t("dash.kpi.profitHint", { rate: formatPercent(result.marginRate) })
                  : t("dash.kpi.profitNoRevenue")
              }
              delta={deltas?.profit ?? null}
              tone={result.profit >= 0 ? "ok" : "danger"}
            />
          ) : null}
          {sales ? (
            <Kpi
              icon={<Package size={18} strokeWidth={2} />}
              label={t("dash.kpi.quantity")}
              value={formatNumber(sales.quantitySold)}
              hint={
                sales.returnedQuantity > 0
                  ? t("dash.kpi.quantityReturned", { count: formatNumber(sales.returnedQuantity) })
                  : t("dash.kpi.quantityHint")
              }
              delta={deltas?.quantity ?? null}
            />
          ) : null}
        </section>
      )}

      {result ? (
        <Banner tone="warn">
          <Rich
            text={t("dash.estimateWarning")}
            parts={{ lead: <strong>{t("dash.estimateWarningLead")}</strong> }}
          />
        </Banner>
      ) : null}

      {/* ------------------------------------------------------------- trend */}
      {trend ? (
        <Card title={t("dash.trend.title")} hint={t("dash.trend.hint")}>
          <ChartLegend
            items={[
              { label: t("dash.kpi.revenue"), color: "var(--chart-1)" },
              { label: t("dash.chart.charges"), color: "var(--chart-2)" },
            ]}
          />
          <TrendChart data={trend.points} selected={month} onSelect={setMonth} />
          <h4 className="chart-subtitle">{t("dash.trend.monthlyResult")}</h4>
          <ResultStrip data={trend.points} selected={month} />
        </Card>
      ) : null}

      <div className="dashboard-grid">
        {/* -------------------------------------------------------- ventes */}
        {sales ? (
          <Card title={t("dash.bestSellers")} hint={t("dash.bestSellersHint")}>
            <RankBars
              rows={sales.topProducts.map(
                (p): RankRow => ({
                  id: p.itemId,
                  label: p.name,
                  value: p.revenue,
                  display: formatCurrency(p.revenue),
                  meta: `${formatQuantity(p.quantity, p.unit)} · ${p.reference}`,
                }),
              )}
              empty={t("dash.noSales")}
            />
          </Card>
        ) : null}

        {sales ? (
          <Card title={t("dash.quantitiesSold")} hint={t("dash.quantitiesSoldHint")}>
            <RankBars
              rows={sales.topProductsByQuantity.map(
                (p): RankRow => ({
                  id: p.itemId,
                  label: p.name,
                  value: p.quantity,
                  display: formatQuantity(p.quantity, p.unit),
                  meta: formatCurrency(p.revenue),
                }),
              )}
              empty={t("dash.noSales")}
            />
          </Card>
        ) : null}

        {sales ? (
          <Card title={t("dash.collection")} hint={t("dash.collectionHint")}>
            <div className="mini-stats">
              <MiniStat label={t("dash.invoiced")} value={formatCurrency(sales.revenue)} />
              <MiniStat label={t("dash.collected")} value={formatCurrency(sales.collected)} tone="ok" />
              <MiniStat
                label={t("dash.outstanding")}
                value={formatCurrency(sales.outstanding)}
                tone={sales.outstanding > 0 ? "warn" : "ok"}
              />
            </div>
            <Meter value={sales.collected} max={Math.max(sales.revenue, 1)} tone="ok" />
            <p className="chart-caption">
              {sales.revenue > 0
                ? t("dash.collectedShare", { rate: formatPercent(sales.collected / sales.revenue) })
                : t("dash.nothingInvoiced")}
              {sales.returnedValue > 0
                ? ` ${t("dash.returnedGoods", { value: formatCurrency(sales.returnedValue) })}`
                : ""}
            </p>
            {sales.topCustomers.length > 0 ? (
              <>
                <h4 className="chart-subtitle">{t("dash.topCustomers")}</h4>
                <RankBars
                  rows={sales.topCustomers.map(
                    (c): RankRow => ({
                      id: c.customerId,
                      label: c.name,
                      value: c.revenue,
                      display: formatCurrency(c.revenue),
                      meta: tn("dash.orderCount", c.orderCount),
                    }),
                  )}
                />
              </>
            ) : null}
          </Card>
        ) : null}

        {/* --------------------------------------------------------- charges */}
        {costs && result ? (
          <Card title={t("dash.costSplit")} hint={t("dash.costSplitHint")}>
            <CompositionBar
              total={result.totalCost}
              label={t("dash.chart.costSplitLabel")}
              empty={t("dash.chart.noCosts")}
              segments={[
                { label: t("dash.cost.materials"), value: result.materialCost, color: "var(--chart-1)" },
                { label: t("dash.cost.payroll"), value: result.payrollCost, color: "var(--chart-2)" },
                { label: t("dash.cost.factory"), value: result.factoryCost, color: "var(--chart-3)" },
              ]}
            />
            <div className="mini-stats">
              <MiniStat label={t("dash.cost.monthTotal")} value={formatCurrency(result.totalCost)} />
              <MiniStat
                label={t("dash.cost.purchases")}
                value={formatCurrency(costs.purchases)}
                hint={t("dash.cost.purchasesHint")}
              />
            </div>
          </Card>
        ) : null}

        {costs ? (
          <Card title={t("dash.factoryCosts")} hint={t("dash.factoryCostsHint")}>
            {costs.biggest ? (
              <div className="highlight-row">
                <span className="highlight-row-label">{t("dash.biggestCost")}</span>
                <span className="highlight-row-value">{costs.biggest.label}</span>
                <Pill tone="warn">{formatCurrency(costs.biggest.amount)}</Pill>
              </div>
            ) : null}
            <RankBars
              rows={costs.byLabel.map(
                (c): RankRow => ({ id: c.label, label: c.label, value: c.amount, display: formatCurrency(c.amount) }),
              )}
              empty={t("dash.noFactoryCosts")}
            />
          </Card>
        ) : null}

        {/* ------------------------------------------------------- matières */}
        {materials ? (
          <Card title={t("dash.materials")} hint={t("dash.materialsHint")}>
            <div className="mini-stats">
              <MiniStat label={t("dash.purchased")} value={formatCurrency(materials.purchasedValue)} />
              <MiniStat label={t("dash.consumed")} value={formatCurrency(materials.consumedValue)} />
            </div>
            <h4 className="chart-subtitle">{t("dash.mostBought")}</h4>
            <RankBars
              rows={materials.mostBought.map(
                (m): RankRow => ({
                  id: m.itemId,
                  label: m.name,
                  value: m.quantity,
                  display: formatQuantity(m.quantity, m.unit),
                  meta: m.value > 0 ? formatCurrency(m.value) : undefined,
                }),
              )}
              empty={t("dash.noMaterialIn")}
            />
            <h4 className="chart-subtitle">{t("dash.mostUsed")}</h4>
            <RankBars
              rows={materials.mostUsed.map(
                (m): RankRow => ({
                  id: m.itemId,
                  label: m.name,
                  value: m.quantity,
                  display: formatQuantity(m.quantity, m.unit),
                  meta: m.value > 0 ? formatCurrency(m.value) : undefined,
                }),
              )}
              empty={t("dash.noMaterialOut")}
            />
          </Card>
        ) : null}

        {materials ? (
          <Card title={t("dash.mostExpensive")} hint={t("dash.mostExpensiveHint")}>
            <RankBars
              rows={materials.mostExpensive.map(
                (m): RankRow => ({
                  id: m.itemId,
                  label: m.name,
                  value: m.unitCost,
                  display: `${formatCurrency(m.unitCost)} / ${m.unit}`,
                  meta: m.reference,
                }),
              )}
              empty={t("dash.noValuedMaterial")}
            />
          </Card>
        ) : null}

        {/* ------------------------------------------------------------- RH */}
        {hr ? (
          <Card title={t("dash.employees")} hint={t("dash.employeesHint")}>
            <div className="mini-stats">
              <MiniStat
                label={t("dash.headcount")}
                value={formatNumber(hr.headcount)}
                icon={<Users size={15} strokeWidth={2} />}
              />
              <MiniStat label={t("dash.payrollGross")} value={formatCurrency(hr.payrollGross)} />
              <MiniStat label={t("dash.hoursLogged")} value={`${formatNumber(hr.hoursWorked)} ${t("unit.hours")}`} />
              <MiniStat
                label={t("dash.absenceDays")}
                value={formatNumber(hr.absenceDays)}
                tone={hr.absenceDays > 0 ? "warn" : "ok"}
              />
            </div>
            <h4 className="chart-subtitle">{t("dash.topPaid")}</h4>
            <RankBars
              rows={hr.topPaid.map(
                (e): RankRow => ({
                  id: e.employeeId,
                  label: e.name,
                  value: e.gross,
                  display: formatCurrency(e.gross),
                  meta: t("dash.topPaidMeta", { position: e.position, net: formatCurrency(e.net) }),
                }),
              )}
              empty={t("dash.noEmployees")}
            />
            <h4 className="chart-subtitle">{t("dash.topHours")}</h4>
            <RankBars
              rows={hr.topHours.map(
                (e): RankRow => ({
                  id: e.employeeId,
                  label: e.name,
                  value: e.hours,
                  display: `${formatNumber(e.hours)} ${t("unit.hours")}`,
                  meta: e.position,
                }),
              )}
              empty={t("dash.noHours")}
            />
          </Card>
        ) : null}

        {/* ---------------------------------------------------------- zakat */}
        {zakat ? (
          <Card
            title={t("dash.zakat")}
            hint={zakat.source === "pinned" ? t("dash.zakatPinned") : t("dash.zakatLive")}
          >
            <div className="zakat-headline">
              <span className="zakat-headline-label">{t("dash.zakatDue")}</span>
              <span className="zakat-headline-value">{formatCurrency(zakat.zakatDue)}</span>
              <Pill tone={zakat.belowNisab ? "neutral" : zakat.remaining > 0 ? "warn" : "ok"}>
                {zakat.belowNisab
                  ? t("dash.zakatBelowNisab")
                  : zakat.remaining > 0
                    ? t("dash.zakatRemaining")
                    : t("dash.zakatPaidLabel")}
              </Pill>
            </div>
            <Meter
              value={zakat.zakatableBase}
              max={Math.max(zakat.nisabValue, zakat.zakatableBase, 1)}
              tone={zakat.belowNisab ? "accent" : "warn"}
            />
            <p className="chart-caption">
              {t("dash.zakatBase", {
                base: formatCurrency(zakat.zakatableBase),
                nisab: formatCurrency(zakat.nisabValue),
              })}
            </p>
            <div className="mini-stats">
              <MiniStat label={t("dash.paid")} value={formatCurrency(zakat.amountPaid)} tone="ok" />
              <MiniStat
                label={t("dash.remaining")}
                value={formatCurrency(zakat.remaining)}
                tone={zakat.remaining > 0 ? "warn" : "ok"}
              />
              <MiniStat label={t("dash.dueDate")} value={zakat.dueDateHijriLabel} />
            </div>
          </Card>
        ) : null}

        {/* ---------------------------------------------------------- stock */}
        {stock ? (
          <Card
            title={t("dash.stockNow")}
            hint={t("dash.stockNowHint")}
            action={
              <button type="button" className="link-button" onClick={onGoToStock}>
                {t("dash.goToStock")}
              </button>
            }
          >
            <div className="mini-stats">
              <MiniStat
                label={t("dash.stockValue")}
                value={formatCurrency(stock.stockValue)}
                icon={<Boxes size={15} strokeWidth={2} />}
              />
              <MiniStat label={t("dash.trackedItems")} value={formatNumber(stock.totalItems)} />
              <MiniStat
                label={t("dash.belowThreshold")}
                value={formatNumber(stock.lowStockCount)}
                tone={stock.lowStockCount > 0 ? "warn" : "ok"}
              />
            </div>

            <h4 className="chart-subtitle">{t("dash.valueByInventory")}</h4>
            <RankBars
              rows={stock.valueByType.map(
                (type): RankRow => ({
                  id: type.id,
                  label: type.label,
                  value: type.value,
                  display: formatCurrency(type.value),
                  meta: tn("dash.itemCount", type.itemCount),
                }),
              )}
              empty={t("dash.noValuedItems")}
            />

            <h4 className="chart-subtitle">{t("dash.toReorder")}</h4>
            {stock.lowStockItems.length === 0 ? (
              <ChartEmpty>{t("dash.allAboveThreshold")}</ChartEmpty>
            ) : (
              <ul className="alert-list">
                {stock.lowStockItems.map((item) => (
                  <li key={item.id} className="alert-list-row">
                    <span>{item.name}</span>
                    <span className="alert-list-type">{item.inventoryTypeLabel}</span>
                    <span className="tabular alert-list-qty">{formatQuantity(item.quantity, item.unit)}</span>
                    <Pill tone="warn">
                      {t("dash.threshold", { value: formatQuantity(item.reorderThreshold, item.unit) })}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Card({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dash-card">
      <header className="dash-card-head">
        <div>
          <h3 className="dash-card-title">{title}</h3>
          {hint ? <p className="dash-card-hint">{hint}</p> : null}
        </div>
        {action}
      </header>
      <div className="dash-card-body">{children}</div>
    </section>
  );
}

/**
 * A headline figure with its change against the previous month. The delta's
 * colour is direction × whether up is good — a rise in charges is not green.
 * A null delta means there is no previous figure to compare to, which is
 * shown as "nouveau" rather than as a fabricated +100 %.
 */
function Kpi({
  icon,
  label,
  value,
  hint,
  delta,
  tone = "neutral",
  upIsGood = true,
  hero,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  tone?: "neutral" | "ok" | "danger";
  upIsGood?: boolean;
  hero?: boolean;
}) {
  return (
    <article className={`kpi kpi-${tone} ${hero ? "kpi-hero" : ""}`.trim()}>
      <span className="kpi-icon">{icon}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-foot">
        <DeltaBadge delta={delta ?? null} upIsGood={upIsGood} />
        {hint ? <span className="kpi-hint">{hint}</span> : null}
      </span>
    </article>
  );
}

function DeltaBadge({ delta, upIsGood }: { delta: number | null; upIsGood: boolean }) {
  const { t } = useI18n();

  if (delta == null) {
    return (
      <span className="delta delta-none">
        <Minus size={12} strokeWidth={2.5} /> {t("dash.delta.new")}
      </span>
    );
  }
  const up = delta >= 0;
  const good = up === upIsGood;
  return (
    <span className={`delta ${good ? "delta-good" : "delta-bad"}`}>
      {up ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
      {formatPercent(Math.abs(delta))}
      <span className="delta-period">{t("dash.delta.period")}</span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "ok" | "warn";
  icon?: ReactNode;
}) {
  return (
    <div className={`mini-stat mini-stat-${tone}`}>
      <span className="mini-stat-label">
        {icon}
        {label}
      </span>
      <span className="mini-stat-value">{value}</span>
      {hint ? <span className="mini-stat-hint">{hint}</span> : null}
    </div>
  );
}
