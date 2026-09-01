import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import { useInventoryTypes } from "../../state/InventoryTypesContext";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
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
 * so switching products starts the costing over.
 */
export function FinancePage() {
  const { types, loading: typesLoading } = useInventoryTypes();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [lines, setLines] = useState<CostLine[]>(emptyLines());
  const [marginTarget, setMarginTarget] = useState("30");

  const finishedGoodsType = types.find((t) => t.key === "finished-goods");

  const load = useCallback((typeId: string) => {
    setLoading(true);
    setError(null);
    return fetchItems(typeId)
      .then((data) => setItems([...data].sort((a, b) => a.name.localeCompare(b.name, "fr"))))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les produits finis."))
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

  const marginPct = Number(marginTarget);
  const marginValid = Number.isFinite(marginPct) && marginPct >= 0 && marginPct < 100;
  const suggestedPrice = marginValid && totalCost > 0 ? totalCost / (1 - marginPct / 100) : null;

  const realPrice = selectedItem?.price ?? null;
  const realMarginPct = realPrice && realPrice > 0 && totalCost >= 0 ? ((realPrice - totalCost) / realPrice) * 100 : null;
  const gapVsSuggested = realPrice != null && suggestedPrice != null ? realPrice - suggestedPrice : null;

  if (typesLoading || loading) return <p className="loading-text">Chargement…</p>;

  if (!finishedGoodsType) {
    return (
      <div className="page-stack">
        <EmptyState
          title="Aucun inventaire « Produits finis » n'est configuré"
          description="Le calculateur de marge compare toujours au prix de vente d'un produit fini du Stock. Créez d'abord cet inventaire."
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder="Rechercher un produit fini…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Field label="Produit" hint="Le prix de vente affiché à droite vient de Stock — Produits finis">
        <select className="input" value={selectedItemId} onChange={(e) => selectItem(e.target.value)}>
          <option value="">— Choisir un produit —</option>
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
        <EmptyState title="Sélectionnez un produit pour commencer" description="Le calcul de coût et de marge apparaîtra ici." />
      ) : (
        <>
          <div className="detail-pills">
            {selectedItem.color ? <Pill>{selectedItem.color}</Pill> : null}
            {selectedItem.size ? <Pill>{selectedItem.size}</Pill> : null}
            {selectedItem.gender ? <Pill>{selectedItem.gender}</Pill> : null}
            <Pill tone="neutral">Stock actuel : {selectedItem.quantity} {selectedItem.unit}</Pill>
          </div>

          <div className="order-lines-editor">
            <p className="order-lines-title">Coûts</p>
            {lines.map((line) => (
              <div key={line.id} className="order-line-editor">
                <input
                  className="input"
                  placeholder="Ex. matières, main-d'œuvre, énergie…"
                  value={line.label}
                  onChange={(e) => updateLine(line.id, { label: e.target.value })}
                />
                <input
                  className="input order-line-qty"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Montant"
                  value={line.amount}
                  onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                />
                <Button variant="ghost" onClick={() => removeLine(line.id)}>
                  Suppr.
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={addLine}>
              + Ajouter un coût
            </Button>
            <p className="order-lines-total">Coût total : {formatCurrency(totalCost)}</p>
          </div>

          <Field label="Marge cible (%)" hint="Sert à calculer le prix suggéré ci-dessous">
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
            <Banner tone="info">Ajoutez au moins un coût pour obtenir un prix suggéré et une marge.</Banner>
          ) : !marginValid ? (
            <Banner tone="warn">La marge cible doit être comprise entre 0 et 99 %.</Banner>
          ) : (
            <>
              <div className="stat-grid">
                <StatCard label="Coût total" value={formatCurrency(totalCost)} />
                <StatCard
                  label={`Prix suggéré (marge ${marginPct}%)`}
                  value={suggestedPrice != null ? formatCurrency(suggestedPrice) : "—"}
                />
                <StatCard
                  label="Prix de vente actuel (stock)"
                  value={realPrice != null ? formatCurrency(realPrice) : "—"}
                  hint={realPrice == null ? "Aucun prix renseigné sur cet article" : undefined}
                />
                <StatCard
                  label="Marge réelle actuelle"
                  value={realMarginPct != null ? `${realMarginPct.toFixed(1)} %` : "—"}
                  tone={realMarginPct == null ? "neutral" : realMarginPct < 0 ? "danger" : realMarginPct < marginPct ? "warn" : "ok"}
                  hint={realMarginPct != null ? `Objectif : ${marginPct}%` : undefined}
                />
              </div>

              {realPrice != null && realPrice < totalCost ? (
                <Banner tone="danger">
                  Le prix de vente actuel ({formatCurrency(realPrice)}) est inférieur au coût total ({formatCurrency(totalCost)}) : ce
                  produit se vend à perte.
                </Banner>
              ) : gapVsSuggested != null && gapVsSuggested < 0 ? (
                <Banner tone="warn">
                  Le prix de vente actuel est {formatCurrency(-gapVsSuggested)} en dessous du prix suggéré pour atteindre {marginPct}% de
                  marge.
                </Banner>
              ) : gapVsSuggested != null ? (
                <Banner tone="info">
                  Le prix de vente actuel dépasse le prix suggéré de {formatCurrency(gapVsSuggested)}.
                </Banner>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
