import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Coins, Wallet, Scale, RefreshCw, HelpCircle } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Rich } from "../../components/ui/Rich";
import { useI18n } from "../../state/LanguageContext";
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
  const { t } = useI18n();
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
      .catch((e) => setError(e instanceof ApiError ? e.message : t("zk.loadFailed")));
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
      setError(e instanceof ApiError ? e.message : t("zk.refreshGoldFailed"));
    } finally {
      setRefreshingGold(false);
    }
  }

  if (!live || pinned === undefined) return <p className="loading-text">{t("state.loading")}</p>;

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="zakat-help-row">
        <button
          type="button"
          className="icon-button"
          title={t("zk.aboutHijriDates")}
          aria-expanded={showHelp}
          onClick={() => setShowHelp((v) => !v)}
        >
          <HelpCircle size={18} strokeWidth={2} />
        </button>
      </div>
      {showHelp ? (
        <Banner tone="warn">
          <Rich text={t("zk.hijriHelpFull")} parts={{ lead: <strong>{t("zk.hijriEstimateLead")}</strong> }} />
        </Banner>
      ) : null}

      <section>
        <div className="inventory-heading">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {t("zk.autoEstimate")}
          </h2>
          <p className="inventory-description">
            {t("zk.autoRecomputed")}
          </p>
        </div>

        <div className="stat-grid">
          <StatCard icon={Wallet} label={t("zk.bankFromPaid")} value={formatCurrency(live.bank)} hint={t("zk.live")} />
          <StatCard
            icon={Wallet}
            label={t("zk.finishedAndMaterials")}
            value={formatCurrency(live.finishedGoodsValue + live.rawMaterialsValue)}
            hint={t("zk.liveStock")}
          />
          <StatCard
            icon={Wallet}
            label={t("zk.receivablesShipped")}
            value={formatCurrency(live.receivablesValue)}
            hint={t("zk.liveSales")}
          />
          <StatCard
            icon={Coins}
            label={t("zk.goldPrice")}
            value={formatCurrency(live.goldPrice.pricePerGram)}
            hint={t("zk.goldSourceHint", {
              source: live.goldPrice.source,
              date: formatDate(live.goldPrice.fetchedAt),
              stale: live.goldPrice.stale ? t("zk.goldCached") : "",
            })}
            tone={live.goldPrice.stale ? "warn" : "neutral"}
          />
        </div>

        {writable ? (
          <div style={{ marginTop: 10 }}>
            <Button variant="ghost" onClick={handleRefreshGold} disabled={refreshingGold}>
              <RefreshCw size={14} strokeWidth={2} />
              {refreshingGold ? t("zk.refreshing") : t("zk.refreshGold")}
            </Button>
          </div>
        ) : null}

        <div className={`zakat-due-banner ${live.belowNisab ? "zakat-due-banner-danger" : "zakat-due-banner-ok"}`} style={{ marginTop: 14 }}>
          <span className="zakat-due-banner-label">
            {t(live.belowNisab ? "zk.estimateBelowNisab" : "zk.estimateDue")}
          </span>
          <span className="zakat-due-banner-value">{formatCurrency(live.zakatDue)}</span>
        </div>
        <p className="zakat-due-explain">
          {t("zk.assetsVsNisab", {
            assets: formatCurrency(live.totalAssets),
            comparator: live.belowNisab ? "<" : "≥",
            nisab: formatCurrency(live.nisabValue),
            suffix: live.belowNisab ? t("zk.belowThresholdSuffix") : ".",
          })}
        </p>
        <p className="field-hint">
          {t("zk.dueIfHawlToday", { hijri: live.dueDateHijriLabel, date: formatDate(live.dueDate) })}
        </p>
      </section>

      <section>
        <div className="inventory-heading">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {t("zk.lastOfficial")}
          </h2>
          {writable ? (
            <Button variant="secondary" onClick={() => onNavigate("calculation")}>
              {t(pinned ? "zk.redoCalculation" : "zk.newCalculation")}
            </Button>
          ) : null}
        </div>

        {pinned === null ? (
          <Banner tone="info">
            {t("zk.nothingPinned")}
          </Banner>
        ) : (
          <>
            <Banner tone="info">
              {t("zk.calculatedOn", {
                date: formatDate(pinned.calculationDate),
                hijri: pinned.calculationHijriLabel,
              })}
            </Banner>
            <div className="stat-grid">
              <StatCard
                icon={CalendarDays}
                label={t("zk.dueDate")}
                value={pinned.dueDateHijriLabel}
                hint={formatDate(pinned.dueDate)}
              />
              <StatCard icon={Scale} label={t("zk.netBase")} value={formatCurrency(pinned.zakatableBase)} />
              <StatCard
                label={t("zk.due")}
                value={pinned.belowNisab ? t("zk.noneBelowNisab") : formatCurrency(pinned.zakatDue)}
                tone={pinned.belowNisab ? "ok" : pinned.paymentStatus === "PAID" ? "ok" : "warn"}
              />
              <StatCard
                label={t("zk.paymentStatus")}
                value={<Pill tone={pinned.paymentStatus === "PAID" ? "ok" : pinned.paymentStatus === "PARTIALLY_PAID" ? "warn" : "danger"}>{t(ZAKAT_PAYMENT_STATUS_LABELS[pinned.paymentStatus])}</Pill>}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
