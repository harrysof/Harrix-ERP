import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Coins, Wallet, Scale, RefreshCw, HelpCircle } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { StatCard } from "../../components/ui/StatCard";
import { Pill } from "../../components/ui/Pill";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  fetchPinnedZakatCalculation,
  fetchZakatLive,
  refreshGoldPrice,
  ZAKAT_PAYMENT_STATUS_LABELS,
  type ApiZakatCalculation,
  type ZakatLive,
} from "../../lib/zakatApi";
import { useAuth } from "../../state/AuthContext";
import type { ZakatTab } from "./ZakatPage";

export function ZakatDashboardPage({ onNavigate }: { onNavigate: (tab: ZakatTab) => void }) {
  const { can } = useAuth();
  const writable = can("finance:write");

  const [live, setLive] = useState<ZakatLive | null>(null);
  const [pinned, setPinned] = useState<ApiZakatCalculation | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshingGold, setRefreshingGold] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([fetchZakatLive(), fetchPinnedZakatCalculation()])
      .then(([nextLive, nextPinned]) => {
        setLive(nextLive);
        setPinned(nextPinned);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger la Zakat."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefreshGold() {
    setRefreshingGold(true);
    try {
      await refreshGoldPrice();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Actualisation du prix de l'or impossible.");
    } finally {
      setRefreshingGold(false);
    }
  }

  if (!live || pinned === undefined) return <p className="loading-text">Chargement…</p>;

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="zakat-help-row">
        <button
          type="button"
          className="icon-button"
          title="À propos des dates hégiriennes"
          aria-expanded={showHelp}
          onClick={() => setShowHelp((v) => !v)}
        >
          <HelpCircle size={18} strokeWidth={2} />
        </button>
      </div>
      {showHelp ? (
        <Banner tone="warn">
          Les dates hégiriennes affichées sur cette page sont des <strong>estimations par calcul arithmétique</strong>{" "}
          (calendrier tabulaire), pas des dates confirmées par observation de la lune — elles peuvent différer d'un jour ou
          deux du calendrier local. Vérifiez auprès d'un savant ou d'une institution de référence avant le paiement.
        </Banner>
      ) : null}

      <section>
        <div className="inventory-heading">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Estimation automatique
          </h2>
          <p className="inventory-description">
            Banque (ventes payées), produits finis, matières premières et créances sont recalculés en direct depuis Stock et
            Ventes. Caisse et déductions ne sont pas suivies automatiquement (comptées à 0 ici) — affinez dans « Calcul de la
            Zakat ».
          </p>
        </div>

        <div className="stat-grid">
          <StatCard icon={Wallet} label="Banque (ventes payées)" value={formatCurrency(live.bank)} hint="Live" />
          <StatCard icon={Wallet} label="Produits finis + matières" value={formatCurrency(live.finishedGoodsValue + live.rawMaterialsValue)} hint="Live — Stock" />
          <StatCard icon={Wallet} label="Créances (expédié, non payé)" value={formatCurrency(live.receivablesValue)} hint="Live — Ventes" />
          <StatCard
            icon={Coins}
            label="Prix de l'or"
            value={formatCurrency(live.goldPrice.pricePerGram)}
            hint={`${live.goldPrice.source} — ${formatDate(live.goldPrice.fetchedAt)}${live.goldPrice.stale ? " (en cache)" : ""}`}
            tone={live.goldPrice.stale ? "warn" : "neutral"}
          />
        </div>

        {writable ? (
          <div style={{ marginTop: 10 }}>
            <Button variant="ghost" onClick={handleRefreshGold} disabled={refreshingGold}>
              <RefreshCw size={14} strokeWidth={2} />
              {refreshingGold ? "Actualisation…" : "Actualiser le prix de l'or"}
            </Button>
          </div>
        ) : null}

        <div className={`zakat-due-banner ${live.belowNisab ? "zakat-due-banner-danger" : "zakat-due-banner-ok"}`} style={{ marginTop: 14 }}>
          <span className="zakat-due-banner-label">
            {live.belowNisab ? "Estimation : sous le nisab, aucune Zakat due" : "Estimation : Zakat probablement due"}
          </span>
          <span className="zakat-due-banner-value">{formatCurrency(live.zakatDue)}</span>
        </div>
        <p className="zakat-due-explain">
          Patrimoine estimé ({formatCurrency(live.totalAssets)}) {live.belowNisab ? "<" : "≥"} nisab actuel (
          {formatCurrency(live.nisabValue)}, 85 g d'or){live.belowNisab ? " — en dessous du seuil, aucune Zakat n'est due." : "."}
        </p>
        <p className="field-hint">
          Échéance si le hawl commençait aujourd'hui : {live.dueDateHijriLabel} ({formatDate(live.dueDate)}).
        </p>
      </section>

      <section>
        <div className="inventory-heading">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Dernier calcul officiel
          </h2>
          {writable ? (
            <Button variant="secondary" onClick={() => onNavigate("calculation")}>
              {pinned ? "Refaire un calcul" : "+ Faire un calcul"}
            </Button>
          ) : null}
        </div>

        {pinned === null ? (
          <Banner tone="info">
            Aucun calcul n'a encore été exporté vers le tableau de bord. Faites un calcul complet (caisse, déductions…) dans
            l'onglet « Calcul de la Zakat », puis exportez-le ici.
          </Banner>
        ) : (
          <>
            <Banner tone="info">
              Calculé le {formatDate(pinned.calculationDate)} ({pinned.calculationHijriLabel}).
            </Banner>
            <div className="stat-grid">
              <StatCard icon={CalendarDays} label="Échéance de la Zakat" value={pinned.dueDateHijriLabel} hint={formatDate(pinned.dueDate)} />
              <StatCard icon={Scale} label="Base nette de Zakat" value={formatCurrency(pinned.zakatableBase)} />
              <StatCard
                label="Zakat due"
                value={pinned.belowNisab ? "Aucune (sous le nisab)" : formatCurrency(pinned.zakatDue)}
                tone={pinned.belowNisab ? "ok" : pinned.paymentStatus === "PAID" ? "ok" : "warn"}
              />
              <StatCard
                label="Statut de paiement"
                value={<Pill tone={pinned.paymentStatus === "PAID" ? "ok" : pinned.paymentStatus === "PARTIALLY_PAID" ? "warn" : "danger"}>{ZAKAT_PAYMENT_STATUS_LABELS[pinned.paymentStatus]}</Pill>}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
