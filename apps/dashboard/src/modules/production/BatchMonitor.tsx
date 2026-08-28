import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { formatDate, formatNumber } from "../../lib/format";
import type { ApiItem } from "../../lib/stockApi";
import { STATUS_LABELS, STATUS_ORDER, type ApiProductionBatch, type BatchFilters, type FilterOptions } from "../../lib/productionApi";
import { STATUS_TONE, describeVariance } from "./types";

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
  const set = (patch: Partial<BatchFilters>) => onFiltersChange({ ...filters, ...patch });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="page-stack">
      <div className="filter-bar">
        <Field label="Du">
          <input className="input" type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
        </Field>
        <Field label="Au">
          <input className="input" type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
        </Field>
        <Field label="Produit">
          <select className="input" value={filters.productItemId ?? ""} onChange={(e) => set({ productItemId: e.target.value })}>
            <option value="">Tous</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Machine">
          <select className="input" value={filters.machine ?? ""} onChange={(e) => set({ machine: e.target.value })}>
            <option value="">Toutes</option>
            {options.machines.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Superviseur">
          <select className="input" value={filters.supervisor ?? ""} onChange={(e) => set({ supervisor: e.target.value })}>
            <option value="">Tous</option>
            {options.supervisors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut">
          <select className="input" value={filters.status ?? ""} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Tous</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        {hasFilters ? (
          <Button variant="ghost" onClick={() => onFiltersChange({})}>
            Réinitialiser
          </Button>
        ) : null}
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Aucun lot ne correspond à ces filtres" : "Aucun lot de production"}
          description={hasFilters ? "Élargissez la période ou réinitialisez les filtres." : "Créez un lot pour commencer à suivre la production."}
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Date</th>
                <th>Produit</th>
                <th>Machine</th>
                <th className="num">Attendu</th>
                <th className="num">Comptabilisé</th>
                <th className="num">1er</th>
                <th className="num">2ème</th>
                <th className="num">Rebut</th>
                <th>Non comptabilisé</th>
                <th>Statut</th>
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
                      <span className="muted">Sortie non déclarée</span>
                    ) : (
                      <Pill tone={b.unknown === 0 ? "ok" : b.needsInvestigation ? "danger" : "warn"}>{describeVariance(b.unknown)}</Pill>
                    )}
                  </td>
                  <td>
                    <Pill tone={STATUS_TONE[b.status]}>{STATUS_LABELS[b.status]}</Pill>
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
