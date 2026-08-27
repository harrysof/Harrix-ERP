import { useCallback, useEffect, useState } from "react";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import { ApiError } from "../../lib/api";
import { Banner } from "../../components/ui/Banner";
import { useLocalCollection } from "../../lib/useLocalCollection";
import { ProductionForm } from "./ProductionForm";
import { ProductionHistory } from "./ProductionHistory";
import type { ProductionRun } from "./types";

export function ProductionPage() {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { items: runs, add: addRun } = useLocalCollection<ProductionRun>("harrix.production-runs.v1");

  const loadItems = useCallback(() => {
    setLoading(true);
    return fetchItems()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger le stock."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const materialItems = items.filter((i) => i.inventoryType.isProductionInput);
  const finishedGoodsItems = items.filter((i) => i.inventoryType.key === "finished-goods");

  return (
    <div className="page-stack">
      <Banner tone="info">
        Le module Production n'a pas encore sa propre base de données — les fiches de production sont enregistrées dans ce navigateur. Les
        mouvements de stock qu'il déclenche (matières consommées, produits finis créés), eux, sont bien réels et passent par la même API que
        l'onglet Stock. Détails dans PROJECT_CONTEXT.md.
      </Banner>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {loading ? (
        <p className="loading-text">Chargement du stock…</p>
      ) : (
        <ProductionForm materialItems={materialItems} finishedGoodsItems={finishedGoodsItems} onSaved={addRun} onStockChanged={loadItems} />
      )}

      <section>
        <h2 className="section-title">Historique des productions</h2>
        <ProductionHistory runs={runs} />
      </section>
    </div>
  );
}
