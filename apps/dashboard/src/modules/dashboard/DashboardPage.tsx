import { useMemo } from "react";
import { useStock } from "../../state/StockContext";
import { StatCard } from "../../components/ui/StatCard";
import { Pill } from "../../components/ui/Pill";
import { getInventoryType } from "../../lib/stockConfig";
import { getExpiryStatus, getItemQuantity, isLowStock, todayIso } from "../../lib/stockEngine";
import { formatQuantity } from "../../lib/format";

export function DashboardPage({ onGoToStock }: { onGoToStock: () => void }) {
  const { items, batches, movements } = useStock();
  const today = todayIso();

  const lowStockItems = useMemo(
    () =>
      items
        .map((item) => ({ item, quantity: getItemQuantity(movements, item.id) }))
        .filter(({ item, quantity }) => isLowStock(quantity, item.reorderThreshold))
        .sort((a, b) => a.quantity - b.quantity),
    [items, movements],
  );

  const watchBatches = useMemo(
    () => batches.filter((b) => getExpiryStatus(b.expiryDate, today) !== "ok" && getExpiryStatus(b.expiryDate, today) !== "none"),
    [batches, today],
  );

  return (
    <div className="page-stack">
      <section>
        <h2 className="section-title">Aujourd'hui</h2>
        <div className="stat-grid">
          <StatCard label="Articles suivis" value={items.length} hint="Dans les 4 inventaires" />
          <StatCard
            label="Alertes stock faible"
            value={lowStockItems.length}
            tone={lowStockItems.length > 0 ? "warn" : "ok"}
            hint={lowStockItems.length > 0 ? "Sous le seuil de réapprovisionnement" : "Tout est au-dessus du seuil"}
            onClick={onGoToStock}
          />
          <StatCard
            label="Lots à surveiller"
            value={watchBatches.length}
            tone={watchBatches.length > 0 ? "danger" : "ok"}
            hint="Produits chimiques expirés ou bientôt périmés"
            onClick={onGoToStock}
          />
        </div>
      </section>

      {lowStockItems.length > 0 && (
        <section>
          <div className="panel">
            <div className="panel-header">
              <h2 className="section-title">Articles en stock faible</h2>
              <button type="button" className="link-button" onClick={onGoToStock}>
                Voir le stock →
              </button>
            </div>
            <ul className="alert-list">
              {lowStockItems.slice(0, 5).map(({ item, quantity }) => (
                <li key={item.id} className="alert-list-row">
                  <span>{item.name}</span>
                  <span className="alert-list-type">{getInventoryType(item.inventoryTypeId).label}</span>
                  <span className="tabular alert-list-qty">{formatQuantity(quantity, item.unit)}</span>
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
