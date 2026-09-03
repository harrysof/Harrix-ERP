import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatNumber } from "../../lib/format";
import type { LossGroup, ProductionSummary } from "../../lib/productionApi";
import { formatRate } from "./types";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";

/**
 * Waste and loss management: the losses that would otherwise disappear inside
 * a single finished quantity, broken out and attributed.
 *
 * The breakdowns exist so a recurring problem can be located — a waste rate on
 * its own says something is wrong, "Ligne 2 at 14 %" says where to look. Each
 * table is sorted worst-first by the backend.
 */
export function LossesPanel({ summary }: { summary: ProductionSummary }) {
  const { t } = useI18n();
  const { totals } = summary;

  if (totals.batchCount === 0) {
    return (
      <EmptyState
        title={t("prod.noOutputPeriod")}
        description={t("prod.noOutputPeriodDesc")}
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <StatCard
          label={t("prod.yieldRate")}
          value={formatRate(totals.rates.yieldRate)}
          hint={t("prod.units", { count: formatNumber(totals.firstChoice) })}
          tone="ok"
        />
        <StatCard
          label={t("prod.secondRate")}
          value={formatRate(totals.rates.secondChoiceRate)}
          hint={t("prod.units", { count: formatNumber(totals.secondChoice) })}
          tone="warn"
        />
        <StatCard
          label={t("prod.wasteRate")}
          value={formatRate(totals.rates.wasteRate)}
          hint={t("prod.units", { count: formatNumber(totals.waste) })}
          tone="warn"
        />
        <StatCard
          label={t("prod.unknownRate")}
          value={formatRate(totals.rates.unknownRate)}
          hint={t("prod.unitsOfExpected", {
            count: formatNumber(totals.unknown),
            expected: formatNumber(totals.expected),
          })}
          tone={totals.unknown === 0 ? "ok" : "danger"}
        />
      </div>

      <div className="stat-grid">
        <StatCard label={t("prod.batchesCounted")} value={formatNumber(totals.batchCount)} hint={t("prod.outputDeclared")} />
        <StatCard
          label={t("prod.batchesRunning")}
          value={formatNumber(summary.runningBatches)}
          hint={t("prod.outputNotYet")}
        />
        <StatCard
          label={t("prod.openInvestigations")}
          value={formatNumber(summary.openInvestigations)}
          hint={t("prod.openInvestigationsHint")}
          tone={summary.openInvestigations > 0 ? "danger" : "ok"}
        />
        <StatCard
          label={t("prod.totalAccounted")}
          value={formatNumber(totals.accounted)}
          hint={t("prod.ofExpected", { expected: formatNumber(totals.expected) })}
        />
      </div>

      <LossTable title="prod.lossesByProduct" groups={summary.byProduct} unitLabel="prod.groupProduct" />
      <LossTable title="prod.lossesByMachine" groups={summary.byMachine} unitLabel="prod.groupMachine" />
      <LossTable title="prod.lossesByPeriod" groups={summary.byPeriod} unitLabel="prod.groupMonth" />
    </div>
  );
}

function LossTable({ title, groups, unitLabel }: { title: TranslationKey; groups: LossGroup[]; unitLabel: TranslationKey }) {
  const { t } = useI18n();
  if (groups.length === 0) return null;

  return (
    <section>
      <h3 className="section-title">{t(title)}</h3>
      <div className="table-scroll">
        <table className="stock-table">
          <thead>
            <tr>
              <th>{t(unitLabel)}</th>
              <th className="num">{t("prod.col.batches")}</th>
              <th className="num">{t("prod.col.expected")}</th>
              <th className="num">{t("prod.col.waste")}</th>
              <th className="num">{t("prod.col.unknown")}</th>
              <th className="num">{t("prod.col.yield")}</th>
              <th className="num">{t("prod.col.wasteRate")}</th>
              <th className="num">{t("prod.col.unknownRate")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className={g.unknown !== 0 ? "row-attention" : undefined}>
                <td>{g.label}</td>
                <td className="tabular num">{formatNumber(g.batchCount)}</td>
                <td className="tabular num">{formatNumber(g.expected)}</td>
                <td className="tabular num">{formatNumber(g.waste)}</td>
                <td className="tabular num">{formatNumber(g.unknown)}</td>
                <td className="tabular num">{formatRate(g.rates.yieldRate)}</td>
                <td className="tabular num">{formatRate(g.rates.wasteRate)}</td>
                <td className="tabular num">{formatRate(g.rates.unknownRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
