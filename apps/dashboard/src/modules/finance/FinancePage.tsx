import { useCallback, useEffect, useState } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import {
  clearMaterialOverride,
  createCostCategory,
  createCostEntry,
  currentMonth,
  deleteCostCategory,
  deleteCostEntry,
  duplicateMonth,
  fetchCostCategories,
  fetchCostEntries,
  fetchOverview,
  monthLabel,
  setMaterialOverride,
  setProductMargin,
  shiftMonth,
  updateCostCategory,
  updateCostEntry,
  updateFinanceSettings,
  type CostCategory,
  type CostEntry,
  type FinanceOverview,
  type ProductCosting,
} from "../../lib/financeApi";
import { CostsPanel } from "./CostsPanel";
import { PricingPanel } from "./PricingPanel";
import { CostEntryModal } from "./CostEntryModal";
import { CostCategoryModal } from "./CostCategoryModal";
import { MaterialOverrideModal } from "./MaterialOverrideModal";
import { PricingSettingsModal } from "./PricingSettingsModal";
import { DuplicateMonthModal } from "./DuplicateMonthModal";
import { ProductMarginModal } from "./ProductMarginModal";

type Tab = "costs" | "pricing";

type ModalState =
  | { kind: "none" }
  | { kind: "add-entry" }
  | { kind: "edit-entry"; entry: CostEntry }
  | { kind: "add-category" }
  | { kind: "edit-category"; category: CostCategory }
  | { kind: "material-override" }
  | { kind: "settings" }
  | { kind: "duplicate" }
  | { kind: "margin"; product: ProductCosting };

/**
 * Finance — two views over the same period.
 *
 * **Coûts** is what the factory spent: a register the accountant fills in,
 * with the raw-material line already computed from what production consumed.
 * **Prix** turns that into a cost per finished unit and a price to sell at.
 *
 * The period is one month by default, because that is the accounting unit,
 * and a range is available for a quarter or a year. Nothing on either screen
 * is stored as a total — every figure is recomputed from the underlying rows
 * on each read, so re-opening a closed month gives the same answer.
 */
export function FinancePage() {
  const [tab, setTab] = useState<Tab>("costs");
  const [month, setMonth] = useState(currentMonth());
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const period = rangeEnd ? { from: month, to: rangeEnd } : { month };

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchOverview(period), fetchCostCategories(), fetchCostEntries(period)])
      .then(([nextOverview, nextCategories, nextEntries]) => {
        setOverview(nextOverview);
        setCategories(nextCategories);
        setEntries(nextEntries);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les données financières."))
      .finally(() => setLoading(false));
    // The period object is rebuilt each render; its two strings are the real
    // dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, rangeEnd]);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs a write, then reloads — every figure on screen is derived from the rows. */
  async function run(action: () => Promise<unknown>, message?: string) {
    await action();
    await load();
    setModal({ kind: "none" });
    if (message) setNotice(message);
  }

  async function removeEntry(entry: CostEntry) {
    if (!window.confirm(`Supprimer « ${entry.label} » ? Cette charge ne comptera plus dans le total de la période.`)) return;
    try {
      await run(() => deleteCostEntry(entry.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  async function removeCategory(category: CostCategory) {
    if (!window.confirm(`Supprimer la catégorie « ${category.label} » ?`)) return;
    try {
      await run(() => deleteCostCategory(category.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible.");
    }
  }

  if (loading && !overview) return <div className="page-stack">Chargement…</div>;
  if (!overview) {
    return (
      <div className="page-stack">
        <Banner tone="danger">{error ?? "Données financières indisponibles."}</Banner>
      </div>
    );
  }

  const materialsLine = overview.register.lines.find((l) => l.derived) ?? null;
  const activeOverride = overview.overrides.find((o) => o.month === month) ?? null;

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {notice ? <Banner tone="info">{notice}</Banner> : null}

      <div className="toolbar">
        <div className="tab-strip">
          <button
            type="button"
            className={`tab-strip-item ${tab === "costs" ? "tab-strip-item-active" : ""}`}
            onClick={() => setTab("costs")}
          >
            Coûts
          </button>
          <button
            type="button"
            className={`tab-strip-item ${tab === "pricing" ? "tab-strip-item-active" : ""}`}
            onClick={() => setTab("pricing")}
          >
            Prix
          </button>
        </div>

        <div className="period-picker">
          <Button variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">
            ‹
          </Button>
          <Field label={rangeEnd ? "Du mois" : "Mois"}>
            <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          {rangeEnd ? (
            <Field label="Au mois">
              <input className="input" type="month" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </Field>
          ) : null}
          <Button variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant">
            ›
          </Button>
          <Button variant="ghost" onClick={() => setRangeEnd(rangeEnd ? null : shiftMonth(month, 2))}>
            {rangeEnd ? "Un seul mois" : "Sur une période"}
          </Button>
        </div>
      </div>

      {rangeEnd ? (
        <Banner tone="info">
          Période de {overview.period.months.length} mois. Les charges se cumulent, et le coût des matières de chaque mois est
          pris avec sa correction éventuelle. La correction du coût des matières se fait mois par mois.
        </Banner>
      ) : null}

      {tab === "costs" ? (
        <CostsPanel
          overview={overview}
          categories={categories}
          entries={entries}
          onAddEntry={() => setModal({ kind: "add-entry" })}
          onEditEntry={(entry) => setModal({ kind: "edit-entry", entry })}
          onDeleteEntry={removeEntry}
          onAddCategory={() => setModal({ kind: "add-category" })}
          onEditCategory={(category) => setModal({ kind: "edit-category", category })}
          onDeleteCategory={removeCategory}
          onCorrectMaterials={() => setModal({ kind: "material-override" })}
          onDuplicateMonth={() => setModal({ kind: "duplicate" })}
        />
      ) : (
        <PricingPanel
          overview={overview}
          onEditSettings={() => setModal({ kind: "settings" })}
          onEditMargin={(product) => setModal({ kind: "margin", product })}
        />
      )}

      {modal.kind === "add-entry" ? (
        <CostEntryModal
          categories={categories}
          products={overview.products}
          month={month}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => run(() => createCostEntry(input))}
        />
      ) : null}

      {modal.kind === "edit-entry" ? (
        <CostEntryModal
          categories={categories}
          products={overview.products}
          month={month}
          entry={modal.entry}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => run(() => updateCostEntry(modal.entry.id, input))}
        />
      ) : null}

      {modal.kind === "add-category" ? (
        <CostCategoryModal
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => run(() => createCostCategory(input))}
        />
      ) : null}

      {modal.kind === "edit-category" ? (
        <CostCategoryModal
          category={modal.category}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={({ key: _key, ...input }) => run(() => updateCostCategory(modal.category.id, input))}
        />
      ) : null}

      {modal.kind === "material-override" && materialsLine ? (
        <MaterialOverrideModal
          month={month}
          computed={materialsLine.computedAmount ?? 0}
          existing={activeOverride}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => run(() => setMaterialOverride(input))}
          onClear={() => run(() => clearMaterialOverride(month), `Correction de ${monthLabel(month)} supprimée.`)}
        />
      ) : null}

      {modal.kind === "settings" ? (
        <PricingSettingsModal
          settings={overview.settings}
          allocation={overview.allocation}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => run(() => updateFinanceSettings(input))}
        />
      ) : null}

      {modal.kind === "duplicate" ? (
        <DuplicateMonthModal
          month={month}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            const result = await duplicateMonth(input);
            await load();
            setModal({ kind: "none" });
            setNotice(
              `${result.created} charge(s) copiée(s) de ${monthLabel(input.from)} vers ${monthLabel(input.to)}. Vérifiez les montants avant de vous y fier.`,
            );
          }}
        />
      ) : null}

      {modal.kind === "margin" ? (
        <ProductMarginModal
          product={modal.product}
          defaultMargin={overview.settings.defaultMargin}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(targetMargin) => run(() => setProductMargin(modal.product.productItemId, targetMargin))}
        />
      ) : null}
    </div>
  );
}
