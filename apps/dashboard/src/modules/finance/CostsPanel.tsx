import { useMemo, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  COST_BEHAVIOR_LABELS,
  COST_NATURE_LABELS,
  monthLabel,
  type CostCategory,
  type CostEntry,
  type FinanceOverview,
} from "../../lib/financeApi";
import { useAuth } from "../../state/AuthContext";

interface CostsPanelProps {
  overview: FinanceOverview;
  categories: CostCategory[];
  entries: CostEntry[];
  onAddEntry: () => void;
  onEditEntry: (entry: CostEntry) => void;
  onDeleteEntry: (entry: CostEntry) => void;
  onAddCategory: () => void;
  onEditCategory: (category: CostCategory) => void;
  onDeleteCategory: (category: CostCategory) => void;
  onCorrectMaterials: () => void;
  onDuplicateMonth: () => void;
}

/**
 * The cost register: what the factory spent over the period, by category.
 *
 * The materials line is the one that behaves differently, and it is marked as
 * such — it is summed from what production consumed rather than typed, and it
 * is corrected rather than edited, so the computed figure never disappears
 * behind someone's adjustment.
 */
export function CostsPanel({
  overview,
  categories,
  entries,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onCorrectMaterials,
  onDuplicateMonth,
}: CostsPanelProps) {
  const { can } = useAuth();
  const canWrite = can("finance:write");
  const canManage = can("finance:manage");
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const { lines, totals } = overview.register;
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const entriesByCategory = useMemo(() => {
    const map = new Map<string, CostEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.categoryId) ?? [];
      list.push(entry);
      map.set(entry.categoryId, list);
    }
    return map;
  }, [entries]);

  const singleMonth = overview.period.months.length === 1;

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <StatCard
          label="Total des coûts"
          value={formatCurrency(totals.total)}
          hint={`Sur ${overview.period.label}`}
        />
        <StatCard
          label="Coûts directs"
          value={formatCurrency(totals.direct)}
          hint="Matières et charges rattachables à un produit"
        />
        <StatCard
          label="Charges indirectes"
          value={formatCurrency(totals.indirect)}
          hint="À répartir sur tout ce qui est produit"
        />
        <StatCard
          label="Charges fixes"
          value={formatCurrency(totals.fixed)}
          hint="Dues même si l'usine s'arrête"
          tone={totals.fixed > 0 && overview.production.totalUnits === 0 ? "warn" : "neutral"}
        />
      </div>

      {overview.register.warnings.map((w, index) => (
        <Banner key={`${w.code}-${index}`} tone={w.code === "MATERIALS_OVERRIDDEN" ? "info" : "warn"}>
          {w.message}
        </Banner>
      ))}

      <div className="toolbar">
        <div>
          <h3 className="section-title">Registre des coûts — {overview.period.label}</h3>
          <p className="section-hint">
            Chaque catégorie avec ce qu'elle a coûté sur la période. Dépliez une ligne pour voir les charges qui la composent.
          </p>
        </div>
        <div className="toolbar-actions">
          {canWrite && singleMonth ? (
            <Button variant="ghost" onClick={onDuplicateMonth}>
              Reprendre un mois
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="ghost" onClick={onAddCategory}>
              + Catégorie
            </Button>
          ) : null}
          {canWrite ? (
            <Button variant="primary" onClick={onAddEntry}>
              + Nouvelle charge
            </Button>
          ) : null}
        </div>
      </div>

      <div className="table-scroll">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Nature</th>
              <th>Comportement</th>
              <th className="num">Lignes</th>
              <th className="num">Montant</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const category = categoryById.get(line.categoryId);
              const rows = entriesByCategory.get(line.categoryId) ?? [];
              const open = openCategoryId === line.categoryId;

              return [
                <tr key={line.categoryId} className={line.derived ? "row-derived" : undefined}>
                  <td>
                    <button
                      type="button"
                      className="link-cell"
                      onClick={() => setOpenCategoryId(open ? null : line.categoryId)}
                      disabled={line.derived || rows.length === 0}
                    >
                      <strong>{line.label}</strong>
                    </button>
                    {line.derived ? (
                      <span className="cell-note">
                        Calculé depuis la production — {overview.production.batchCount} lot(s) déclaré(s)
                      </span>
                    ) : category?.description ? (
                      <span className="cell-note">{category.description}</span>
                    ) : null}
                    {line.override ? (
                      <span className="cell-note cell-note-warn">
                        Corrigé : {formatCurrency(line.computedAmount ?? 0)} calculés → {formatCurrency(line.amount)}.{" "}
                        {line.override.reason}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Pill tone={line.nature === "DIRECT" ? "ok" : "neutral"}>{COST_NATURE_LABELS[line.nature]}</Pill>
                  </td>
                  <td>
                    <Pill tone={line.behavior === "FIXED" ? "warn" : "neutral"}>{COST_BEHAVIOR_LABELS[line.behavior]}</Pill>
                  </td>
                  <td className="num">{line.derived ? "—" : line.entryCount || "—"}</td>
                  <td className="num">
                    <strong>{formatCurrency(line.amount)}</strong>
                    {line.derived && line.override ? (
                      <span className="cell-sub cell-strike">{formatCurrency(line.computedAmount ?? 0)}</span>
                    ) : null}
                  </td>
                  <td className="row-actions">
                    {line.derived && canWrite && singleMonth ? (
                      <Button variant="ghost" onClick={onCorrectMaterials}>
                        Corriger
                      </Button>
                    ) : null}
                    {!line.derived && canManage && category ? (
                      <>
                        <Button variant="ghost" onClick={() => onEditCategory(category)}>
                          Modifier
                        </Button>
                        {!category.isProtected ? (
                          <Button variant="ghost" onClick={() => onDeleteCategory(category)}>
                            Supprimer
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </td>
                </tr>,

                open
                  ? rows.map((entry) => (
                      <tr key={entry.id} className="row-child">
                        <td colSpan={3}>
                          <span className="child-label">{entry.label}</span>
                          {entry.productItem ? (
                            <span className="cell-note">Rattaché à {entry.productItem.name}</span>
                          ) : entry.category.nature === "DIRECT" ? (
                            <span className="cell-note cell-note-warn">
                              Coût direct sans produit — réparti comme une charge indirecte
                            </span>
                          ) : null}
                          {entry.notes ? <span className="cell-note">{entry.notes}</span> : null}
                        </td>
                        <td className="num">{formatDate(entry.date)}</td>
                        <td className="num">{formatCurrency(entry.amount)}</td>
                        <td className="row-actions">
                          {canWrite ? (
                            <>
                              <Button variant="ghost" onClick={() => onEditEntry(entry)}>
                                Modifier
                              </Button>
                              <Button variant="ghost" onClick={() => onDeleteEntry(entry)}>
                                Supprimer
                              </Button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  : null,
              ];
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <strong>Total {overview.period.label}</strong>
              </td>
              <td className="num">
                <strong>{formatCurrency(totals.total)}</strong>
              </td>
              <td />
            </tr>
            <tr className="row-child">
              <td colSpan={4}>
                dont {formatCurrency(totals.fixed)} de charges fixes et {formatCurrency(totals.variable)} de charges variables
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title={`Aucune charge saisie pour ${monthLabel(overview.period.from)}`}
          description="Le coût des matières est déjà calculé depuis la production. Ajoutez le loyer, l'énergie, les salaires — tout ce que l'usine paie — pour obtenir un coût de revient complet."
          action={
            canWrite ? (
              <Button variant="primary" onClick={onAddEntry}>
                + Nouvelle charge
              </Button>
            ) : undefined
          }
        />
      ) : null}
    </div>
  );
}
