import { useEffect, useState } from "react";
import { fetchStockSummary, type StockSummary } from "../../lib/stockApi";
import { ApiError } from "../../lib/api";
import { StatCard } from "../../components/ui/StatCard";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { formatQuantity } from "../../lib/format";

export function DashboardPage({ onGoToStock }: { onGoToStock: () => void }) {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockSummary()
      .then(setSummary)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger le tableau de bord."));
  }, []);

  if (error) return <Banner tone="danger">{error}</Banner>;
  if (!summary) return <p className="loading-text">Chargement…</p>;

  return (
    <div className="page-stack">
      <section>
        <h2 className="section-title">Aujourd'hui</h2>
        <div className="stat-grid">
          <StatCard label="Articles suivis" value={summary.totalItems} hint="Dans les 4 inventaires" />
          <StatCard
            label="Alertes stock faible"
            value={summary.lowStockCount}
            tone={summary.lowStockCount > 0 ? "warn" : "ok"}
            hint={summary.lowStockCount > 0 ? "Sous le seuil de réapprovisionnement" : "Tout est au-dessus du seuil"}
            onClick={onGoToStock}
          />
          <StatCard
            label="Lots à surveiller"
            value={summary.watchBatchCount}
            tone={summary.watchBatchCount > 0 ? "danger" : "ok"}
            hint="Produits chimiques expirés ou bientôt périmés"
            onClick={onGoToStock}
          />
        </div>
      </section>

      {summary.lowStockItems.length > 0 && (
        <section>
          <div className="panel">
            <div className="panel-header">
              <h2 className="section-title">Articles en stock faible</h2>
              <button type="button" className="link-button" onClick={onGoToStock}>
                Voir le stock →
              </button>
            </div>
            <ul className="alert-list">
              {summary.lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="alert-list-row">
                  <span>{item.name}</span>
                  <span className="alert-list-type">{item.inventoryTypeLabel}</span>
                  <span className="tabular alert-list-qty">{formatQuantity(item.quantity, item.unit)}</span>
                  <Pill tone="warn">seuil {formatQuantity(item.reorderThreshold, item.unit)}</Pill>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Indicateurs à venir</h2>
        <div className="stat-grid">
          <StatCard label="Ventes" value="—" hint="Connecté quand le module Commandes sera construit" placeholder />
          <StatCard label="Taux de marge brut" value="—" hint="Calculé à partir des coûts réels de production" placeholder />
          <StatCard label="Meilleures ventes" value="—" hint="Top 5 produits, une fois le catalogue en place" placeholder />
          <StatCard label="Réconciliation production" value="—" hint="Produit vs. compté, le cœur du projet" placeholder />
        </div>
      </section>
    </div>
  );
}
