import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../state/LanguageContext";
import { Field } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  createZakatCalculation,
  fetchGoldPrice,
  fetchZakatAutoPull,
  pinZakatCalculation,
  refreshGoldPrice,
  GOLD_NISAB_GRAMS,
  ZAKAT_METHODOLOGIES,
  ZAKAT_METHODOLOGY_LABELS,
  type ApiGoldPrice,
  type ZakatMethodology,
} from "../../lib/zakatApi";
import type { ZakatTab } from "./ZakatPage";

interface Totals {
  cashAndBank: number;
  totalAssets: number;
  nisabValue: number;
  zakatableBase: number;
  belowNisab: boolean;
  zakatDue: number;
}

/** Mirrors backend/src/zakat/zakat-math.ts's computeZakatTotals — a live preview only; the server recomputes the truth on save. */
function computeTotals(inputs: {
  cash: number;
  bank: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  receivablesValue: number;
  otherAssets: number;
  deductions: number;
  goldPricePerGram: number;
  zakatRate: number;
}): Totals {
  const cashAndBank = inputs.cash + inputs.bank;
  const totalAssets = cashAndBank + inputs.finishedGoodsValue + inputs.rawMaterialsValue + inputs.receivablesValue + inputs.otherAssets;
  const zakatableBase = Math.max(0, totalAssets - inputs.deductions);
  const nisabValue = GOLD_NISAB_GRAMS * inputs.goldPricePerGram;
  const belowNisab = zakatableBase < nisabValue;
  const zakatDue = belowNisab ? 0 : zakatableBase * inputs.zakatRate;
  return { cashAndBank, totalAssets, nisabValue, zakatableBase, belowNisab, zakatDue };
}

function n(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ZakatCalculationPage({ onNavigate }: { onNavigate: (tab: ZakatTab) => void }) {
  const [loadingPull, setLoadingPull] = useState(true);
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [goldPrice, setGoldPrice] = useState<ApiGoldPrice | null>(null);
  const [refreshingGold, setRefreshingGold] = useState(false);

  const [calculationDate, setCalculationDate] = useState(todayIso());
  const [methodology, setMethodology] = useState<ZakatMethodology>("LUNAR");
  const [goldPricePerGram, setGoldPricePerGram] = useState("");
  const [cash, setCash] = useState("0");
  const [bank, setBank] = useState("0");
  const [finishedGoodsValue, setFinishedGoodsValue] = useState("0");
  const [rawMaterialsValue, setRawMaterialsValue] = useState("0");
  const [receivablesValue, setReceivablesValue] = useState("0");
  const [otherAssets, setOtherAssets] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [zakatRate, setZakatRate] = useState("2.5");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setLoadingPull(true);
    Promise.all([fetchZakatAutoPull(), fetchGoldPrice()])
      .then(([pull, price]) => {
        setBank(String(pull.bankValue));
        setFinishedGoodsValue(String(pull.finishedGoodsValue));
        setRawMaterialsValue(String(pull.rawMaterialsValue));
        setReceivablesValue(String(pull.receivablesValue));
        setGoldPrice(price);
        setGoldPricePerGram(String(price.pricePerGram));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("zk.loadAutoFailed")))
      .finally(() => setLoadingPull(false));
  }, []);

  async function handleRefreshGold() {
    setRefreshingGold(true);
    try {
      const price = await refreshGoldPrice();
      setGoldPrice(price);
      setGoldPricePerGram(String(price.pricePerGram));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("zk.refreshGoldFailed"));
    } finally {
      setRefreshingGold(false);
    }
  }

  const totals = computeTotals({
    cash: n(cash),
    bank: n(bank),
    finishedGoodsValue: n(finishedGoodsValue),
    rawMaterialsValue: n(rawMaterialsValue),
    receivablesValue: n(receivablesValue),
    otherAssets: n(otherAssets),
    deductions: n(deductions),
    goldPricePerGram: n(goldPricePerGram),
    zakatRate: n(zakatRate) / 100,
  });

  async function submit(exportAfter: boolean) {
    const goldPriceValue = n(goldPricePerGram);
    if (goldPriceValue <= 0) return setError(t("zk.err.goldPrice"));

    setError(null);
    setSavedId(null);
    setExported(false);
    if (exportAfter) setExporting(true);
    else setSaving(true);
    try {
      const created = await createZakatCalculation({
        calculationDate,
        methodology,
        goldPricePerGram: goldPriceValue,
        cash: n(cash),
        bank: n(bank),
        finishedGoodsValue: n(finishedGoodsValue),
        rawMaterialsValue: n(rawMaterialsValue),
        receivablesValue: n(receivablesValue),
        otherAssets: n(otherAssets),
        deductions: n(deductions),
        zakatRate: n(zakatRate) / 100,
        notes: notes.trim() || undefined,
      });
      setSavedId(created.id);
      if (exportAfter) {
        await pinZakatCalculation(created.id);
        setExported(true);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
      setExporting(false);
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {savedId ? (
        <Banner tone="info">
          {t("zk.savedNotice", { suffix: exported ? t("zk.savedAndPinned") : "" })}
          <button type="button" className="link-button" onClick={() => onNavigate("history")}>
            {t("zk.viewInHistory")}
          </button>
          {!exported ? (
            <>
              {" · "}
              <button
                type="button"
                className="link-button"
                onClick={async () => {
                  setExporting(true);
                  try {
                    await pinZakatCalculation(savedId);
                    setExported(true);
                  } catch (e) {
                    setError(e instanceof ApiError ? e.message : t("zk.pinFailed"));
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {t("zk.pin")}
              </button>
            </>
          ) : (
            <>
              {" · "}
              <button type="button" className="link-button" onClick={() => onNavigate("dashboard")}>
                {t("zk.viewDashboard")}
              </button>
            </>
          )}
        </Banner>
      ) : null}

      <section className="card-section">
        <h3>{t("zk.dateAndMethod")}</h3>
        <div className="form-row">
          <Field label={t("zk.calculationDate")} hint={t("zk.hawlAnchor")}>
            <input className="input" type="date" value={calculationDate} onChange={(e) => setCalculationDate(e.target.value)} />
          </Field>
          <Field label={t("zk.methodology")}>
            <select className="input" value={methodology} onChange={(e) => setMethodology(e.target.value as ZakatMethodology)}>
              {ZAKAT_METHODOLOGIES.map((m) => (
                <option key={m} value={m}>
                  {t(ZAKAT_METHODOLOGY_LABELS[m])}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t("zk.goldPriceLabel")}
            hint={
              goldPrice
                ? t("zk.goldPriceHint", {
                    source: goldPrice.source,
                    date: formatDate(goldPrice.fetchedAt),
                    stale: goldPrice.stale ? t("zk.goldCached") : "",
                  })
                : t("zk.goldPriceHintShort")
            }
          >
            <div className="field-inline-group">
              <input className="input" type="number" min={0} step="any" value={goldPricePerGram} onChange={(e) => setGoldPricePerGram(e.target.value)} />
              <Button variant="ghost" onClick={handleRefreshGold} disabled={refreshingGold} title={t("zk.refreshFromSource")}>
                <RefreshCw size={14} strokeWidth={2} />
              </Button>
            </div>
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>{t("zk.liquidity")}</h3>
        <div className="form-row">
          <Field label={t("zk.cashDzd")} hint={t("zk.cashHint")}>
            <input className="input" type="number" min={0} step="any" value={cash} onChange={(e) => setCash(e.target.value)} />
          </Field>
          <Field label={t("zk.bankDzd")} hint={t("zk.bankHint")}>
            <input className="input" type="number" min={0} step="any" value={bank} onChange={(e) => setBank(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>
          {t("zk.tradeStock")} {loadingPull ? <span className="field-hint">{t("zk.loadingAuto")}</span> : null}
        </h3>
        <div className="form-row">
          <Field label={t("zk.finishedGoodsDzd")} hint={t("zk.finishedGoodsHint")}>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={finishedGoodsValue}
              onChange={(e) => setFinishedGoodsValue(e.target.value)}
            />
          </Field>
          <Field label={t("zk.rawMaterialsDzd")} hint={t("zk.rawMaterialsHint")}>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={rawMaterialsValue}
              onChange={(e) => setRawMaterialsValue(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>{t("zk.receivablesSection")}</h3>
        <div className="form-row">
          <Field label={t("zk.receivablesDzd")} hint={t("zk.receivablesHint")}>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={receivablesValue}
              onChange={(e) => setReceivablesValue(e.target.value)}
            />
          </Field>
          <Field label={t("zk.otherAssetsDzd")}>
            <input className="input" type="number" min={0} step="any" value={otherAssets} onChange={(e) => setOtherAssets(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>{t("zk.deductionsSection")}</h3>
        <div className="form-row">
          <Field label={t("zk.deductionsDzd")} hint={t("zk.deductionsHint")}>
            <input className="input" type="number" min={0} step="any" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </Field>
          <Field label={t("zk.rateDzd")}>
            <input className="input" type="number" min={0} max={100} step="any" value={zakatRate} onChange={(e) => setZakatRate(e.target.value)} />
          </Field>
        </div>
        <Field label={t("field.notes")} hint={t("state.optional")}>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>

      <section>
        <h4 className="section-title">{t("zk.zakatableAssets")}</h4>
        <div className="list-card">
          <table className="stock-table">
            <tbody>
              <tr>
                <td>{t("zk.cash")}</td>
                <td className="tabular num">{formatCurrency(n(cash))}</td>
              </tr>
              <tr>
                <td>{t("zk.bank")}</td>
                <td className="tabular num">{formatCurrency(n(bank))}</td>
              </tr>
              <tr>
                <td>{t("zk.finishedGoods")}</td>
                <td className="tabular num">{formatCurrency(n(finishedGoodsValue))}</td>
              </tr>
              <tr>
                <td>{t("zk.rawMaterials")}</td>
                <td className="tabular num">{formatCurrency(n(rawMaterialsValue))}</td>
              </tr>
              <tr>
                <td>{t("zk.receivables")}</td>
                <td className="tabular num">{formatCurrency(n(receivablesValue))}</td>
              </tr>
              <tr>
                <td>{t("zk.otherAssets")}</td>
                <td className="tabular num">{formatCurrency(n(otherAssets))}</td>
              </tr>
              <tr className="zakat-total-row">
                <td>
                  <strong>{t("zk.total")}</strong>
                </td>
                <td className="tabular num">
                  <strong>{formatCurrency(totals.totalAssets)}</strong>
                </td>
              </tr>
              <tr>
                <td>{t("zk.deductions")}</td>
                <td className="tabular num">− {formatCurrency(n(deductions))}</td>
              </tr>
              <tr className="zakat-total-row">
                <td>
                  <strong>{t("zk.netBase")}</strong>
                </td>
                <td className="tabular num">
                  <strong>{formatCurrency(totals.zakatableBase)}</strong>
                </td>
              </tr>
              <tr>
                <td>{t("zk.nisab")}</td>
                <td className="tabular num">{formatCurrency(totals.nisabValue)}</td>
              </tr>
              <tr>
                <td>{t("zk.rate")}</td>
                <td className="tabular num">{n(zakatRate)} %</td>
              </tr>
              <tr className="zakat-total-row">
                <td>
                  <strong>{t("zk.zakatDueCaps")}</strong>
                </td>
                <td className="tabular num">
                  <strong>{totals.belowNisab ? t("zk.noneBelowNisab") : formatCurrency(totals.zakatDue)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="row-actions">
        <Button variant="secondary" onClick={() => submit(false)} disabled={saving || exporting}>
          {saving ? t("action.saving") : t("zk.save")}
        </Button>
        <Button variant="primary" onClick={() => submit(true)} disabled={saving || exporting}>
          {exporting ? t("action.saving") : t("zk.saveAndPin")}
        </Button>
      </div>
    </div>
  );
}
