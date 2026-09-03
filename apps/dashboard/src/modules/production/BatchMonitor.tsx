import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { formatDate, formatNumber } from "../../lib/format";
import type { ApiItem } from "../../lib/stockApi";
import { STATUS_LABELS, STATUS_ORDER, type ApiProductionBatch, type BatchFilters, type FilterOptions } from "../../lib/productionApi";
import { STATUS_TONE, describeVariance } from "./types";
import { useI18n } from "../../state/LanguageContext";

interface BatchMonitorProps {
  batches: ApiProductionBatch[];
  products: ApiItem[];
  options: FilterOptions;
  filters: BatchFilters;
  onFiltersChange: (filters: BatchFilters) => void;
  onOpen: (batch: ApiProductionBatch) => void;
}

/**
 * Production monitoring: every batch, what it was supposed to make, what was
 * actually accounted for, and the gap between the two. The unknown column is
 * deliberately never blank — it either shows a number or says the output has
 * not been declared, so a gap can't hide behind an empty cell.
 */
export function BatchMonitor({ batches, products, options, filters, onFiltersChange, onOpen }: BatchMonitorProps) {
  const { t } = useI18n();
  const set = (patch: Partial<BatchFilters>) => onFiltersChange({ ...filters, ...patch });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="page-stack">
      <div className="filter-bar">
        <Field label={t("field.from")}>
          <input className="input" type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
        </Field>
        <Field label={t("field.to")}>
          <input className="input" type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
        </Field>
        <Field label={t("prod.filter.product")}>
          <select className="input" value={filters.productItemId ?? ""} onChange={(e) => set({ productItemId: e.target.value })}>
            <option value="">{t("state.all")}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("prod.filter.machine")}>
          <select className="input" value={filters.machine ?? ""} onChange={(e) => set({ machine: e.target.value })}>
            <option value="">{t("state.allFeminine")}</option>
            {options.machines.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("prod.filter.supervisor")}>
          <select className="input" value={filters.supervisor ?? ""} onChange={(e) => set({ supervisor: e.target.value })}>
            <option value="">{t("state.all")}</option>
            {options.supervisors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("field.status")}>
          <select className="input" value={filters.status ?? ""} onChange={(e) => set({ status: e.target.value })}>
            <option value="">{t("state.all")}</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABELS[s])}
              </option>
            ))}
          </select>
        </Field>
        {hasFilters ? (
          <Button variant="ghost" onClick={() => onFiltersChange({})}>
            {t("action.reset")}
          </Button>
        ) : null}
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title={hasFilters ? t("prod.noBatchMatch") : t("prod.noBatches")}
          description={hasFilters ? t("prod.widenPeriod") : t("prod.createFirst")}
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>{t("prod.col.batch")}</th>
                <th>{t("field.date")}</th>
                <th>{t("prod.filter.product")}</th>
                <th>{t("prod.filter.machine")}</th>
                <th className="num">{t("prod.col.expected")}</th>
                <th className="num">{t("prod.col.accounted")}</th>
                <th className="num">{t("prod.col.first")}</th>
                <th className="num">{t("prod.col.second")}</th>
                <th className="num">{t("prod.col.waste")}</th>
                <th>{t("prod.col.unknown")}</th>
                <th>{t("field.status")}</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className={b.needsInvestigation ? "row-attention" : undefined}>
                  <td>
                    <button type="button" className="link-button" onClick={() => onOpen(b)}>
                      {b.code}
                    </button>
                  </td>
                  <td className="tabular">{formatDate(b.date)}</td>
                  <td>{b.product.name}</td>
                  <td>
                    {b.machine}
                    <span className="muted"> · {b.shift}</span>
                  </td>
                  <td className="tabular num">{formatNumber(b.expectedQuantity)}</td>
                  <td className="tabular num">{b.outputDeclared ? formatNumber(b.accountedOutput) : "—"}</td>
                  <td className="tabular num">{b.outputDeclared ? formatNumber(b.firstChoice) : "—"}</td>
                  <td className="tabular num">{b.outputDeclared ? formatNumber(b.secondChoice) : "—"}</td>
                  <td className="tabular num">{b.outputDeclared ? formatNumber(b.waste) : "—"}</td>
                  <td>
                    {b.unknown === null ? (
                      <span className="muted">{t("prod.outputNotDeclared")}</span>
                    ) : (
                      <Pill tone={b.unknown === 0 ? "ok" : b.needsInvestigation ? "danger" : "warn"}>
                        {(() => {
                          const variance = describeVariance(b.unknown);
                          return t(variance.key, { count: variance.count });
                        })()}
                      </Pill>
                    )}
                  </td>
                  <td>
                    <Pill tone={STATUS_TONE[b.status]}>{t(STATUS_LABELS[b.status])}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
