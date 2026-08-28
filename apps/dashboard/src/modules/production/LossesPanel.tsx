import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatNumber } from "../../lib/format";
import type { LossGroup, ProductionSummary } from "../../lib/productionApi";
import { formatRate } from "./types";

/**
 * Waste and loss management: the losses that would otherwise disappear inside
 * a single finished quantity, broken out and attributed.
 *
 * The breakdowns exist so a recurring problem can be located — a waste rate on
 * its own says something is wrong, "Ligne 2 at 14 %" says where to look. Each
 * table is sorted worst-first by the backend.
 */
export function LossesPanel({ summary }: { summary: ProductionSummary }) {
  const { totals } = summary;

  if (totals.batchCount === 0) {
    return (
      <EmptyState
        title="Aucune sortie déclarée sur cette période"
        description="Les pertes et le rendement se calculent à partir des lots dont la sortie a été déclarée."
      />
    );
  }

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <StatCard label="Rendement (1er choix)" value={formatRate(totals.rates.yieldRate)} hint={`${formatNumber(totals.firstChoice)} unités`} tone="ok" />
        <StatCard label="Taux 2ème choix" value={formatRate(totals.rates.secondChoiceRate)} hint={`${formatNumber(totals.secondChoice)} unités`} tone="warn" />
        <StatCard label="Taux de rebut" value={formatRate(totals.rates.wasteRate)} hint={`${formatNumber(totals.waste)} unités`} tone="warn" />
        <StatCard
          label="Taux non comptabilisé"
          value={formatRate(totals.rates.unknownRate)}
          hint={`${formatNumber(totals.unknown)} unités sur ${formatNumber(totals.expected)} attendues`}
          tone={totals.unknown === 0 ? "ok" : "danger"}
        />
      </div>

      <div className="stat-grid">
        <StatCard label="Lots comptés" value={formatNumber(totals.batchCount)} hint="Sortie déclarée" />
        <StatCard label="Lots en cours" value={formatNumber(summary.runningBatches)} hint="Sortie pas encore déclarée" />
        <StatCard
          label="Investigations ouvertes"
          value={formatNumber(summary.openInvestigations)}
          hint="Écarts sans explication enregistrée"
          tone={summary.openInvestigations > 0 ? "danger" : "ok"}
        />
        <StatCard label="Total comptabilisé" value={formatNumber(totals.accounted)} hint={`sur ${formatNumber(totals.expected)} attendues`} />
      </div>

      <LossTable title="Pertes par produit" groups={summary.byProduct} unitLabel="Produit" />
      <LossTable title="Pertes par machine" groups={summary.byMachine} unitLabel="Machine" />
      <LossTable title="Pertes par période" groups={summary.byPeriod} unitLabel="Mois" />
    </div>
  );
}

function LossTable({ title, groups, unitLabel }: { title: string; groups: LossGroup[]; unitLabel: string }) {
  if (groups.length === 0) return null;

  return (
    <section>
      <h3 className="section-title">{title}</h3>
      <div className="table-scroll">
        <table className="stock-table">
          <thead>
            <tr>
              <th>{unitLabel}</th>
              <th className="num">Lots</th>
              <th className="num">Attendu</th>
              <th className="num">Rebut</th>
              <th className="num">Non comptabilisé</th>
              <th className="num">Rendement</th>
              <th className="num">Taux rebut</th>
              <th className="num">Taux non compt.</th>
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
