import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import { useInventoryTypes } from "../../state/InventoryTypesContext";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../state/LanguageContext";
import { Banner } from "../../components/ui/Banner";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { Pill } from "../../components/ui/Pill";

interface CostLine {
  id: number;
  label: string;
  amount: string;
}

function emptyLines(): CostLine[] {
  return [{ id: 1, label: "", amount: "" }];
}

/**
 * A gérant-only margin calculator: pick a finished product, price it up from
 * scratch with whatever cost lines make sense (materials, labour, whatever),
 * and see the result next to the price that's actually on the shelf in Stock
 * — produits finis. Nothing here is saved: it's a scratchpad, not a ledger,
 * so switching products starts the costing over. For a running ledger of
 * general operating costs, see the Coûts d'usine tab instead.
 */
export function MarginCalculatorPage() {
  const { types, loading: typesLoading } = useInventoryTypes();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [lines, setLines] = useState<CostLine[]>(emptyLines());
  const [quantity, setQuantity] = useState("1");
  const [marginTarget, setMarginTarget] = useState("30");

  const finishedGoodsType = types.find((t) => t.key === "finished-goods");

  const load = useCallback((typeId: string) => {
    setLoading(true);
    setError(null);
    return fetchItems(typeId)
      .then((data) => setItems([...data].sort((a, b) => a.name.localeCompare(b.name, "fr"))))
      .catch((e) => setError(e instanceof ApiError ? e.message : t("fin.loadProductsFailed")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (finishedGoodsType) load(finishedGoodsType.id);
  }, [finishedGoodsType, load]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.reference.toLowerCase().includes(query) ||
        (i.color ?? "").toLowerCase().includes(query) ||
        (i.size ?? "").toLowerCase().includes(query),
    );
  }, [items, search]);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;

  function selectItem(id: string) {
    setSelectedItemId(id);
    setLines(emptyLines());
    setQuantity("1");
  }

  function updateLine(id: number, patch: Partial<CostLine>) {
    setLines((current) => current.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((current) => [...current, { id: Date.now(), label: "", amount: "" }]);
  }

  function removeLine(id: number) {
    setLines((current) => (current.length > 1 ? current.filter((l) => l.id !== id) : current));
  }

  const totalCost = lines.reduce((sum, l) => {
    const amount = Number(l.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);

  // The cost lines are usually filled in for a whole production run (e.g. the
  // materials for a batch of 50 pairs), not for one unit — so the price
  // suggestion and margin below are computed on cost ÷ quantité, not on the
  // batch total.
  const quantityValue = Number(quantity);
  const quantityValid = Number.isFinite(quantityValue) && quantityValue > 0;
  const unitCost = quantityValid ? totalCost / quantityValue : totalCost;

  const marginPct = Number(marginTarget);
  const marginValid = Number.isFinite(marginPct) && marginPct >= 0 && marginPct < 100;
  const suggestedPrice = marginValid && unitCost > 0 ? unitCost / (1 - marginPct / 100) : null;

  const realPrice = selectedItem?.price ?? null;
  const realMarginPct = realPrice && realPrice > 0 && unitCost >= 0 ? ((realPrice - unitCost) / realPrice) * 100 : null;
  const gapVsSuggested = realPrice != null && suggestedPrice != null ? realPrice - suggestedPrice : null;

  if (typesLoading || loading) return <p className="loading-text">{t("state.loading")}</p>;

  if (!finishedGoodsType) {
    return (
      <EmptyState
        title={t("fin.noFinishedGoodsInventory")}
        description={t("fin.calculatorNeedsInventory")}
      />
    );
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder={t("fin.searchProduct")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Field label={t("fin.product")} hint={t("fin.currentPriceHint")}>
        <select className="input" value={selectedItemId} onChange={(e) => selectItem(e.target.value)}>
          <option value="">{t("fin.chooseProduct")}</option>
          {visibleItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.reference})
              {i.color ? ` — ${i.color}` : ""}
              {i.size ? ` — ${i.size}` : ""}
            </option>
          ))}
        </select>
      </Field>

      {!selectedItem ? (
        <EmptyState title={t("fin.selectToStart")} description={t("fin.calcAppearsHere")} />
      ) : (
        <>
          <div className="detail-pills">
            {selectedItem.color ? <Pill>{selectedItem.color}</Pill> : null}
            {selectedItem.size ? <Pill>{selectedItem.size}</Pill> : null}
            {selectedItem.gender ? <Pill>{selectedItem.gender}</Pill> : null}
            <Pill tone="neutral">
              {t("fin.currentStock", { quantity: `${selectedItem.quantity} ${selectedItem.unit}` })}
            </Pill>
          </div>

          <div className="order-lines-editor">
            <p className="order-lines-title">{t("fin.costs")}</p>
            {lines.map((line) => (
              <div key={line.id} className="order-line-editor">
                <input
                  className="input"
                  placeholder={t("fin.ph.costLabel")}
                  value={line.label}
                  onChange={(e) => updateLine(line.id, { label: e.target.value })}
                />
                <input
                  className="input order-line-qty"
                  type="number"
                  min={0}
                  step="any"
                  placeholder={t("fin.amount")}
                  value={line.amount}
                  onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                />
                <Button variant="ghost" onClick={() => removeLine(line.id)}>
                  {t("fin.removeShort")}
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={addLine}>
              {t("fin.addCost")}
            </Button>
            <p className="order-lines-total">{t("fin.totalCostLine", { value: formatCurrency(totalCost) })}</p>
          </div>

          <Field label={t("fin.quantityProduced")} hint={t("fin.quantityHint")}>
            <input
              className="input"
              type="number"
              min={1}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ maxWidth: 200 }}
            />
          </Field>

          <Field label={t("fin.targetMargin")} hint={t("fin.targetMarginHint")}>
            <input
              className="input"
              type="number"
              min={0}
              max={99}
              step="any"
              value={marginTarget}
              onChange={(e) => setMarginTarget(e.target.value)}
            />
          </Field>

          {totalCost <= 0 ? (
            <Banner tone="info">{t("fin.addCostForSuggestion")}</Banner>
          ) : !quantityValid ? (
            <Banner tone="warn">{t("fin.err.quantity")}</Banner>
          ) : !marginValid ? (
            <Banner tone="warn">{t("fin.err.margin")}</Banner>
          ) : (
            <>
              <div className="stat-grid">
                <StatCard
                  label={t("fin.totalCost")}
                  value={formatCurrency(totalCost)}
                  hint={quantityValue !== 1 ? t("fin.forQuantity", { quantity: quantityValue }) : undefined}
                />
                <StatCard label={t("fin.unitCost")} value={formatCurrency(unitCost)} hint={t("fin.totalCostForQuantity")} />
                <StatCard
                  label={t("fin.suggestedPrice", { margin: marginPct })}
                  value={suggestedPrice != null ? formatCurrency(suggestedPrice) : "—"}
                  hint={t("fin.perUnit")}
                />
                <StatCard
                  label={t("fin.currentPrice")}
                  value={realPrice != null ? formatCurrency(realPrice) : "—"}
                  hint={realPrice == null ? t("fin.noPriceSet") : undefined}
                />
                <StatCard
                  label={t("fin.actualMargin")}
                  value={realMarginPct != null ? `${realMarginPct.toFixed(1)} %` : "—"}
                  tone={realMarginPct == null ? "neutral" : realMarginPct < 0 ? "danger" : realMarginPct < marginPct ? "warn" : "ok"}
                  hint={realMarginPct != null ? t("fin.targetLabel", { margin: marginPct }) : undefined}
                />
              </div>

              {realPrice != null && realPrice < unitCost ? (
                <Banner tone="danger">
                  {t("fin.sellingAtLoss", {
                    price: formatCurrency(realPrice),
                    cost: formatCurrency(unitCost),
                  })}
                </Banner>
              ) : gapVsSuggested != null && gapVsSuggested < 0 ? (
                <Banner tone="warn">
                  {t("fin.belowSuggested", {
                    gap: formatCurrency(-gapVsSuggested),
                    margin: marginPct,
                  })}
                </Banner>
              ) : gapVsSuggested != null ? (
                <Banner tone="info">
                  {t("fin.aboveSuggested", { gap: formatCurrency(gapVsSuggested) })}
                </Banner>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
