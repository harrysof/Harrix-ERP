import { useCallback, useEffect, useState } from "react";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import {
  fetchBatches,
  fetchFilterOptions,
  fetchProductionSummary,
  type ApiProductionBatch,
  type BatchFilters,
  type FilterOptions,
  type ProductionSummary,
} from "../../lib/productionApi";
import { ApiError } from "../../lib/api";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { BatchMonitor } from "./BatchMonitor";
import { BatchDetailModal } from "./BatchDetailModal";
import { LossesPanel } from "./LossesPanel";
import { NewBatchModal } from "./NewBatchModal";

type Tab = "batches" | "losses";

const EMPTY_OPTIONS: FilterOptions = { machines: [], supervisors: [], operators: [] };

/**
 * Production is fully backend-wired: batches, their material consumption and
 * their output all live in the database, and creating one is a single
 * transactional request. Nothing here touches localStorage — see
 * PROJECT_CONTEXT.md §8.1.
 *
 * The filters drive both views at once, so the loss figures always describe
 * exactly the batches listed next to them.
 */
export function ProductionPage() {
  const [tab, setTab] = useState<Tab>("batches");
  const [filters, setFilters] = useState<BatchFilters>({});

  const [items, setItems] = useState<ApiItem[]>([]);
  const [batches, setBatches] = useState<ApiProductionBatch[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([fetchItems(), fetchBatches(filters), fetchProductionSummary(filters), fetchFilterOptions()])
      .then(([nextItems, nextBatches, nextSummary, nextOptions]) => {
        setItems(nextItems);
        setBatches(nextBatches);
        setSummary(nextSummary);
        setOptions(nextOptions);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger la production."))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const materialItems = items.filter((i) => i.inventoryType.isProductionInput);
  const finishedGoodsItems = items.filter((i) => i.inventoryType.key === "finished-goods");
  const openBatch = batches.find((b) => b.id === openBatchId) ?? null;
  const investigations = batches.filter((b) => b.needsInvestigation).length;

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {investigations > 0 ? (
        <Banner tone="warn">
          {investigations === 1 ? "1 lot présente un écart" : `${investigations} lots présentent un écart`} non expliqué entre la quantité
          annoncée par la machine et la sortie comptabilisée. Ouvrez le lot pour enregistrer ce que la vérification a établi.
        </Banner>
      ) : null}

      <div className="toolbar">
        <div className="tab-strip">
          <button type="button" className={`tab-strip-item ${tab === "batches" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("batches")}>
            Lots de production
            {batches.length > 0 ? <span className="tab-strip-badge">{batches.length}</span> : null}
          </button>
          <button type="button" className={`tab-strip-item ${tab === "losses" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("losses")}>
            Pertes & rendement
          </button>
        </div>
        <div className="toolbar-actions">
          <Button variant="primary" onClick={() => setCreating(true)} disabled={finishedGoodsItems.length === 0}>
            + Nouveau lot
          </Button>
        </div>
      </div>

      {finishedGoodsItems.length === 0 && !loading ? (
        <Banner tone="info">Ajoutez d'abord un produit fini dans l'onglet Stock — c'est ce qu'un lot de production fabrique.</Banner>
      ) : null}

      {loading ? (
        <p className="loading-text">Chargement de la production…</p>
      ) : tab === "batches" ? (
        <BatchMonitor
          batches={batches}
          products={finishedGoodsItems}
          options={options}
          filters={filters}
          onFiltersChange={setFilters}
          onOpen={(b) => setOpenBatchId(b.id)}
        />
      ) : summary ? (
        <LossesPanel summary={summary} />
      ) : null}

      {creating ? (
        <NewBatchModal
          materialItems={materialItems}
          finishedGoodsItems={finishedGoodsItems}
          onClose={() => setCreating(false)}
          onCreated={load}
        />
      ) : null}

      {openBatch ? (
        <BatchDetailModal
          batch={openBatch}
          materialItems={materialItems}
          onClose={() => setOpenBatchId(null)}
          // Refetch everything: a batch mutation moves stock and shifts every
          // loss figure, so refreshing just this one row would leave the rest
          // of the page describing a state that no longer exists.
          onChanged={() => load()}
        />
      ) : null}
    </div>
  );
}
