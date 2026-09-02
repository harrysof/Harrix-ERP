import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
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
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les valeurs automatiques."))
      .finally(() => setLoadingPull(false));
  }, []);

  async function handleRefreshGold() {
    setRefreshingGold(true);
    try {
      const price = await refreshGoldPrice();
      setGoldPrice(price);
      setGoldPricePerGram(String(price.pricePerGram));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Actualisation du prix de l'or impossible.");
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
    if (goldPriceValue <= 0) return setError("Le prix de l'or (DZD/gramme) est obligatoire pour calculer le nisab.");

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
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
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
          Calcul enregistré{exported ? " et exporté vers le tableau de bord" : ""}.{" "}
          <button type="button" className="link-button" onClick={() => onNavigate("history")}>
            Voir dans l'historique
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
                    setError(e instanceof ApiError ? e.message : "Export impossible.");
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                Exporter vers le tableau de bord
              </button>
            </>
          ) : (
            <>
              {" · "}
              <button type="button" className="link-button" onClick={() => onNavigate("dashboard")}>
                Voir le tableau de bord
              </button>
            </>
          )}
        </Banner>
      ) : null}

      <section className="card-section">
        <h3>Date et méthodologie</h3>
        <div className="form-row">
          <Field label="Date de calcul" hint="L'ancrage du hawl">
            <input className="input" type="date" value={calculationDate} onChange={(e) => setCalculationDate(e.target.value)} />
          </Field>
          <Field label="Méthodologie">
            <select className="input" value={methodology} onChange={(e) => setMethodology(e.target.value as ZakatMethodology)}>
              {ZAKAT_METHODOLOGIES.map((m) => (
                <option key={m} value={m}>
                  {ZAKAT_METHODOLOGY_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Prix de l'or (DZD/gramme)"
            hint={
              goldPrice
                ? `Sert à calculer le nisab (85 g) — ${goldPrice.source}, ${formatDate(goldPrice.fetchedAt)}${goldPrice.stale ? " (en cache)" : ""}, modifiable`
                : "Sert à calculer le nisab (85 g)"
            }
          >
            <div className="field-inline-group">
              <input className="input" type="number" min={0} step="any" value={goldPricePerGram} onChange={(e) => setGoldPricePerGram(e.target.value)} />
              <Button variant="ghost" onClick={handleRefreshGold} disabled={refreshingGold} title="Actualiser depuis goldrate24.com">
                <RefreshCw size={14} strokeWidth={2} />
              </Button>
            </div>
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>Liquidités</h3>
        <div className="form-row">
          <Field label="Caisse (DZD)" hint="Non suivie automatiquement (pas de registre de caisse)">
            <input className="input" type="number" min={0} step="any" value={cash} onChange={(e) => setCash(e.target.value)} />
          </Field>
          <Field label="Banque (DZD)" hint="Pré-rempli depuis Ventes — commandes payées, modifiable">
            <input className="input" type="number" min={0} step="any" value={bank} onChange={(e) => setBank(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>Stock de négoce {loadingPull ? <span className="field-hint">— chargement des valeurs automatiques…</span> : null}</h3>
        <div className="form-row">
          <Field label="Produits finis (DZD)" hint="Pré-rempli depuis Stock — Produits finis, modifiable">
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={finishedGoodsValue}
              onChange={(e) => setFinishedGoodsValue(e.target.value)}
            />
          </Field>
          <Field label="Matières premières éligibles (DZD)" hint="Pré-rempli depuis Stock — matières premières, modifiable">
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
        <h3>Créances et autres actifs</h3>
        <div className="form-row">
          <Field label="Créances recouvrables (DZD)" hint="Pré-rempli depuis Ventes — commandes expédiées non payées, modifiable">
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              value={receivablesValue}
              onChange={(e) => setReceivablesValue(e.target.value)}
            />
          </Field>
          <Field label="Autres actifs éligibles (DZD)">
            <input className="input" type="number" min={0} step="any" value={otherAssets} onChange={(e) => setOtherAssets(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card-section">
        <h3>Déductions et taux</h3>
        <div className="form-row">
          <Field label="Déductions éligibles (DZD)" hint="Ex. nette fournisseur — non suivi automatiquement">
            <input className="input" type="number" min={0} step="any" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </Field>
          <Field label="Taux de Zakat (%)">
            <input className="input" type="number" min={0} max={100} step="any" value={zakatRate} onChange={(e) => setZakatRate(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" hint="Facultatif">
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>

      <section>
        <h4 className="section-title">Actifs zakatables</h4>
        <div className="list-card">
          <table className="stock-table">
            <tbody>
              <tr>
                <td>Caisse</td>
                <td className="tabular num">{formatCurrency(n(cash))}</td>
              </tr>
              <tr>
                <td>Banque</td>
                <td className="tabular num">{formatCurrency(n(bank))}</td>
              </tr>
              <tr>
                <td>Produits finis</td>
                <td className="tabular num">{formatCurrency(n(finishedGoodsValue))}</td>
              </tr>
              <tr>
                <td>Matières premières éligibles</td>
                <td className="tabular num">{formatCurrency(n(rawMaterialsValue))}</td>
              </tr>
              <tr>
                <td>Créances recouvrables</td>
                <td className="tabular num">{formatCurrency(n(receivablesValue))}</td>
              </tr>
              <tr>
                <td>Autres actifs éligibles</td>
                <td className="tabular num">{formatCurrency(n(otherAssets))}</td>
              </tr>
              <tr className="zakat-total-row">
                <td>
                  <strong>TOTAL</strong>
                </td>
                <td className="tabular num">
                  <strong>{formatCurrency(totals.totalAssets)}</strong>
                </td>
              </tr>
              <tr>
                <td>Déductions éligibles (dettes frs)</td>
                <td className="tabular num">− {formatCurrency(n(deductions))}</td>
              </tr>
              <tr className="zakat-total-row">
                <td>
                  <strong>Base nette de Zakat</strong>
                </td>
                <td className="tabular num">
                  <strong>{formatCurrency(totals.zakatableBase)}</strong>
                </td>
              </tr>
              <tr>
                <td>Nisab (85 g d'or)</td>
                <td className="tabular num">{formatCurrency(totals.nisabValue)}</td>
              </tr>
              <tr>
                <td>Taux de Zakat</td>
                <td className="tabular num">{n(zakatRate)} %</td>
              </tr>
              <tr className="zakat-total-row">
                <td>
                  <strong>ZAKAT DUE</strong>
                </td>
                <td className="tabular num">
                  <strong>{totals.belowNisab ? "Aucune (sous le nisab)" : formatCurrency(totals.zakatDue)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="row-actions">
        <Button variant="secondary" onClick={() => submit(false)} disabled={saving || exporting}>
          {saving ? "Enregistrement…" : "Enregistrer le calcul"}
        </Button>
        <Button variant="primary" onClick={() => submit(true)} disabled={saving || exporting}>
          {exporting ? "Enregistrement…" : "Enregistrer et exporter vers le tableau de bord"}
        </Button>
      </div>
    </div>
  );
}
