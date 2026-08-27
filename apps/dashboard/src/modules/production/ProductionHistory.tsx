import { EmptyState } from "../../components/ui/EmptyState";
import { Pill } from "../../components/ui/Pill";
import { formatDate, formatNumber } from "../../lib/format";
import type { ProductionRun } from "./types";

export function ProductionHistory({ runs }: { runs: ProductionRun[] }) {
  if (runs.length === 0) {
    return <EmptyState title="Aucune production enregistrée" description="Les productions apparaîtront ici une fois le premier lot enregistré." />;
  }

  const sorted = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="table-scroll">
      <table className="stock-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Produit</th>
            <th>Ouvrier</th>
            <th>Machine</th>
            <th>1er / 2ème / Rebut</th>
            <th>Écart</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((run) => (
            <tr key={run.id}>
              <td className="tabular">{formatDate(run.date)}</td>
              <td>{run.productName}</td>
              <td>{run.worker}</td>
              <td>
                {run.machine} · {run.shift}
              </td>
              <td className="tabular">
                {formatNumber(run.premierChoix)} / {formatNumber(run.deuxiemeChoix)} / {formatNumber(run.rebut)}
              </td>
              <td>
                {run.gap === 0 ? (
                  <Pill tone="ok">0</Pill>
                ) : (
                  <Pill tone="danger">
                    {run.gap} — {run.gapReason}
                  </Pill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
