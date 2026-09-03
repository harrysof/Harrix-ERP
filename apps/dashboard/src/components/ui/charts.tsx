import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { formatCurrency, formatNumber } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";

/**
 * The dashboard's charts. Hand-drawn SVG rather than a charting library: the
 * whole set is four forms, and a library would cost more in bundle and in
 * theme-wrangling than it saves.
 *
 * Colours are the three validated categorical slots (--chart-1..3, defined in
 * index.css for both themes) plus the diverging pair for the result strip.
 * They are assigned by *entity*, never by rank — "chiffre d'affaires" is
 * always slot 1 whatever its size this month.
 *
 * Two rules the forms below all obey:
 *  - text never wears a series colour; identity comes from the swatch beside
 *    it, so a light hue is never asked to be legible as type;
 *  - every figure a bar encodes is also written down (tip label, legend value
 *    or the table under the chart), so the chart is never the only way to
 *    read a number.
 */

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

/** The rendered width of an element, so SVG text can stay at its real size. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth);
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/**
 * Axis ticks and bar tips have no room for "2 718 800,00 DA". Compacted to
 * three significant characters plus a scale suffix, which is what the eye
 * actually reads off an axis — the exact figure lives in the tooltip and in
 * the tables below every chart.
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatNumber(Math.round(value / 100_000) / 10)} M`;
  if (abs >= 1_000) return `${formatNumber(Math.round(value / 100) / 10)} k`;
  return formatNumber(Math.round(value));
}

/** A rounded-top column: 4px radius at the data end, square on the baseline. */
function columnPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

/** The same column hanging below the baseline: rounded at the bottom, square on top. */
function columnPathDown(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y} L${x + width},${y} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x + r},${y + height} Q${x},${y + height} ${x},${y + height - r} Z`;
}

/**
 * The identity channel that is not colour: a swatch, a name, and the value.
 * Present whenever a chart carries two or more series.
 */
export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string; value?: string }>;
}) {
  return (
    <ul className="chart-legend">
      {items.map((item) => (
        <li key={item.label} className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: item.color }} aria-hidden="true" />
          <span className="chart-legend-label">{item.label}</span>
          {item.value ? <span className="chart-legend-value">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <p className="chart-empty">{children}</p>;
}

// ---------------------------------------------------------------------------
// Trend — grouped columns (revenue vs charges) over twelve months
// ---------------------------------------------------------------------------

export interface TrendDatum {
  month: string;
  label: string;
  revenue: number;
  totalCost: number;
  profit: number;
  materialCost: number;
  payrollCost: number;
  factoryCost: number;
  orderCount: number;
  quantity: number;
}

/**
 * Twelve months of revenue against charges, as grouped columns on ONE money
 * axis — the two are the same unit, so there is no second scale to invent.
 * The result (revenue − charges) is not a third column here: it is the
 * diverging strip below, where the zero line does the work a column can't.
 *
 * `selected` is the month the page is showing; it keeps full strength while
 * the other eleven sit back, so the chart says "here is where you are" without
 * a second colour.
 */
export function TrendChart({
  data,
  selected,
  onSelect,
}: {
  data: TrendDatum[];
  selected: string;
  onSelect?: (month: string) => void;
}) {
  const { t } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return <ChartEmpty>{t("dash.trend.empty")}</ChartEmpty>;

  const height = 220;
  const pad = { top: 14, right: 8, bottom: 26, left: 46 };
  const w = Math.max(width, 320);
  const plotW = w - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.totalCost)));
  const ticks = niceTicks(max, 4);
  const scaleMax = ticks[ticks.length - 1];
  const y = (v: number) => pad.top + plotH - (v / scaleMax) * plotH;

  const band = plotW / data.length;
  // Two bars per band with a 2px surface gap between them, capped at 24px so a
  // wide screen gets air rather than fat columns.
  const barW = Math.min(24, Math.max(4, (band - 14) / 2));

  const hoveredDatum = hovered != null ? data[hovered] : null;

  return (
    <div className="chart-frame" ref={ref}>
      <svg width={w} height={height} role="img" aria-label={t("dash.chart.revenueLabel")}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.left - 8} y={y(t) + 4} className="chart-axis-text" textAnchor="end">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x0 = pad.left + i * band;
          const active = d.month === selected;
          const dim = hovered != null && hovered !== i;
          const groupX = x0 + band / 2 - barW - 1;
          return (
            <g
              key={d.month}
              className={`chart-band ${active ? "chart-band-selected" : ""}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect?.(d.month)}
              style={{ cursor: onSelect ? "pointer" : "default", opacity: dim ? 0.55 : 1 }}
            >
              {/* A full-height hit area, so the pointer never has to find a 6px column. */}
              <rect x={x0} y={pad.top} width={band} height={plotH} fill="transparent" />
              {active ? (
                <rect x={x0 + 1} y={pad.top} width={band - 2} height={plotH} rx={6} className="chart-band-highlight" />
              ) : null}
              <path
                d={columnPath(groupX, y(d.revenue), barW, plotH - (y(d.revenue) - pad.top))}
                fill="var(--chart-1)"
              />
              <path
                d={columnPath(groupX + barW + 2, y(d.totalCost), barW, plotH - (y(d.totalCost) - pad.top))}
                fill="var(--chart-2)"
              />
              <text x={x0 + band / 2} y={height - 8} className="chart-axis-text" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}

        <line x1={pad.left} x2={w - pad.right} y1={y(0)} y2={y(0)} className="chart-baseline" />
      </svg>

      {hoveredDatum ? (
        <div
          className="chart-tooltip"
          style={{
            insetInlineStart: `${Math.min(Math.max(pad.left + (hovered! + 0.5) * band, 90), w - 90)}px`,
          }}
        >
          <p className="chart-tooltip-title">{hoveredDatum.label}</p>
          <TooltipRow color="var(--chart-1)" label={t("dash.kpi.revenue")} value={formatCurrency(hoveredDatum.revenue)} />
          <TooltipRow color="var(--chart-2)" label={t("dash.chart.charges")} value={formatCurrency(hoveredDatum.totalCost)} />
          <TooltipRow label={t("dash.chart.result")} value={formatCurrency(hoveredDatum.profit)} strong />
          <TooltipRow label={t("dash.chart.orders")} value={formatNumber(hoveredDatum.orderCount)} />
        </div>
      ) : null}
    </div>
  );
}

function TooltipRow({ color, label, value, strong }: { color?: string; label: string; value: string; strong?: boolean }) {
  return (
    <p className={`chart-tooltip-row ${strong ? "chart-tooltip-row-strong" : ""}`.trim()}>
      {color ? <span className="chart-legend-swatch" style={{ background: color }} aria-hidden="true" /> : null}
      <span className="chart-tooltip-label">{label}</span>
      <span className="chart-tooltip-value">{value}</span>
    </p>
  );
}

/**
 * The result, month by month, as a diverging strip: above the zero line is a
 * profit, below it is a loss. Diverging blue↔red with a gray baseline — the
 * one place polarity, not magnitude, is the message.
 */
export function ResultStrip({ data, selected }: { data: TrendDatum[]; selected: string }) {
  const { t } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  if (data.length === 0) return null;

  const height = 96;
  const pad = { top: 10, right: 8, bottom: 20, left: 46 };
  const w = Math.max(width, 320);
  const plotW = w - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const extent = Math.max(1, ...data.map((d) => Math.abs(d.profit)));
  const zero = pad.top + plotH / 2;
  const y = (v: number) => zero - (v / extent) * (plotH / 2);
  const band = plotW / data.length;
  const barW = Math.min(24, Math.max(4, band - 12));

  return (
    <div className="chart-frame" ref={ref}>
      <svg width={w} height={height} role="img" aria-label={t("dash.chart.resultLabel")}>
        <text x={pad.left - 8} y={zero + 4} className="chart-axis-text" textAnchor="end">
          0
        </text>
        {data.map((d, i) => {
          const x = pad.left + i * band + (band - barW) / 2;
          const h = Math.abs(zero - y(d.profit));
          const active = d.month === selected;
          return (
            <g key={d.month} opacity={active ? 1 : 0.72}>
              <title>{`${d.label} — ${formatCurrency(d.profit)}`}</title>
              {d.profit >= 0 ? (
                <path d={columnPath(x, y(d.profit), barW, h)} fill="var(--chart-positive)" />
              ) : (
                <path d={columnPathDown(x, zero, barW, h)} fill="var(--chart-negative)" />
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={w - pad.right} y1={zero} y2={zero} className="chart-baseline" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rank bars — the leaderboards
// ---------------------------------------------------------------------------

export interface RankRow {
  id: string;
  label: string;
  /** What the bar length encodes. */
  value: number;
  /** Written at the tip — already formatted, because only the caller knows the unit. */
  display: string;
  /** An optional second fact, shown small under the name (e.g. "1 284 paires"). */
  meta?: string;
}

/**
 * A ranked horizontal bar list — the form for "top 5 of anything". One series,
 * so one hue and no legend: the card's title says what is being ranked, and
 * every value is written at the tip, so the bar is a shape for the eye rather
 * than the only way to read the number.
 */
export function RankBars({
  rows,
  empty,
  onSelect,
}: {
  rows: RankRow[];
  empty?: string;
  onSelect?: (id: string) => void;
}) {
  const { t } = useI18n();
  if (rows.length === 0) return <ChartEmpty>{empty ?? t("dash.chart.empty")}</ChartEmpty>;
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ol className="rank-list">
      {rows.map((row, index) => (
        <li key={row.id} className="rank-row">
          <button
            type="button"
            className="rank-row-button"
            onClick={() => onSelect?.(row.id)}
            disabled={!onSelect}
            title={row.label}
          >
            <span className="rank-row-index">{index + 1}</span>
            <span className="rank-row-body">
              <span className="rank-row-head">
                <span className="rank-row-label">{row.label}</span>
                <span className="rank-row-value">{row.display}</span>
              </span>
              <span className="rank-row-track">
                <span className="rank-row-fill" style={{ inlineSize: `${Math.max(2, (row.value / max) * 100)}%` }} />
              </span>
              {row.meta ? <span className="rank-row-meta">{row.meta}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Composition — one horizontal stacked bar
// ---------------------------------------------------------------------------

export interface CompositionSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Part-to-whole in one bar: what the month's charges are made of. Segments are
 * separated by a 2px gap in the surface colour rather than a stroke, and every
 * segment's figure is in the legend beneath — which is also what discharges
 * the light-mode contrast relief on the aqua slot.
 */
export function CompositionBar({
  segments,
  total,
  label,
  empty,
}: {
  segments: CompositionSegment[];
  total: number;
  /** What the bar as a whole depicts, for a screen reader. */
  label: string;
  empty: string;
}) {
  const live = segments.filter((s) => s.value > 0);
  if (live.length === 0 || total <= 0) return <ChartEmpty>{empty}</ChartEmpty>;

  return (
    <div className="composition">
      <div className="composition-bar" role="img" aria-label={label}>
        {live.map((segment) => (
          <span
            key={segment.label}
            className="composition-segment"
            style={{ flexGrow: segment.value, background: segment.color }}
            title={`${segment.label} — ${formatCurrency(segment.value)}`}
          />
        ))}
      </div>
      <ChartLegend
        items={live.map((s) => ({
          label: s.label,
          color: s.color,
          value: `${formatCurrency(s.value)} · ${Math.round((s.value / total) * 100)} %`,
        }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meter — one ratio against a limit
// ---------------------------------------------------------------------------

/**
 * A single ratio against a threshold — used by Zakat (assets vs nisab) and by
 * collection rate. The unfilled track is a lighter step of the fill's own
 * ramp, so the state reads across the whole bar rather than only where it is
 * filled.
 */
export function Meter({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "ok" | "warn" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`meter meter-${tone}`} role="img" aria-label={`${Math.round(pct)} %`}>
      <span className="meter-fill" style={{ inlineSize: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Axis ticks on round numbers: 0 / 500 k / 1 M, never 0 / 437 213 / 874 426. */
function niceTicks(max: number, count: number): number[] {
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(Math.round(t * 100) / 100);
  if (ticks.length < 2) ticks.push(step);
  return ticks;
}
