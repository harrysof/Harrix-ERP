import { useState, type ReactNode } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import type { ApiItem } from "../../lib/stockApi";
import { addConsumption, declareOutput, updateBatch, STATUS_LABELS, type ApiProductionBatch } from "../../lib/productionApi";
import { MaterialLineEditor } from "./MaterialLineEditor";
import { VarianceBreakdown } from "./VarianceBreakdown";
import { STATUS_TONE, emptyMaterialLine, formatRate, type MaterialLine } from "./types";
import { useI18n } from "../../state/LanguageContext";

interface BatchDetailModalProps {
  batch: ApiProductionBatch;
  materialItems: ApiItem[];
  onClose: () => void;
  /** Called after any mutation so the parent can refetch. */
  onChanged: (updated: ApiProductionBatch) => void;
}

/**
 * The fiche for one production batch: what it consumed, what it produced, and
 * what the numbers don't account for. Also where an open batch is finished and
 * where an unexplained variance gets its explanation.
 */
export function BatchDetailModal({ batch, materialItems, onClose, onChanged }: BatchDetailModalProps) {
  const { t, tn } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [firstChoice, setFirstChoice] = useState("");
  const [secondChoice, setSecondChoice] = useState("");
  const [waste, setWaste] = useState("");
  const [expectedOverride, setExpectedOverride] = useState(String(batch.expectedQuantity));

  const [note, setNote] = useState(batch.varianceNote ?? "");
  const [addingMaterials, setAddingMaterials] = useState<MaterialLine[] | null>(null);

  const canDeclare = !batch.outputDeclared && batch.status !== "CANCELLED";
  const expected = Number(expectedOverride) || 0;
  const draftUnknown = expected - (Number(firstChoice) || 0) - (Number(secondChoice) || 0) - (Number(waste) || 0);

  /** Runs one mutation, surfacing its error. Resolves true only on success. */
  async function run(action: () => Promise<ApiProductionBatch>): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      onChanged(await action());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t("prod.batchTitle", { code: batch.code })}
      onClose={onClose}
      width={860}
      footer={<Button onClick={onClose}>{t("action.close")}</Button>}
    >
      <div className="form-stack">
        <div className="batch-meta">
          <MetaItem
            label={t("field.status")}
            value={<Pill tone={STATUS_TONE[batch.status]}>{t(STATUS_LABELS[batch.status])}</Pill>}
          />
          <MetaItem label={t("field.date")} value={formatDate(batch.date)} />
          <MetaItem label={t("prod.filter.product")} value={batch.product.name} />
          <MetaItem label={t("field.machine")} value={batch.machine} />
          <MetaItem label={t("prod.shift")} value={batch.shift} />
          <MetaItem label={t("prod.supervisor")} value={batch.supervisor ?? "—"} />
          <MetaItem label={t("prod.operator")} value={batch.operator ?? "—"} />
          <MetaItem label={t("prod.schedule")} value={batch.startTime ? `${batch.startTime} → ${batch.endTime || "…"}` : "—"} />
        </div>

        {batch.notes ? <p className="batch-notes">{batch.notes}</p> : null}

        <section>
          <h4 className="section-title">{t("prod.consumedMaterials")}</h4>
          {batch.consumptions.length === 0 ? (
            <EmptyState title={t("prod.noMaterialsRecorded")} description={t("prod.noMaterialsDesc")} />
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>{t("prod.material")}</th>
                    <th>{t("field.batch")}</th>
                    <th>{t("field.quantity")}</th>
                    <th>{t("field.unitCost")}</th>
                    <th>{t("prod.col.materialCost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.consumptions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.item.name}</td>
                      <td>{c.stockBatch ? c.stockBatch.batchNumber : <span className="muted">—</span>}</td>
                      <td className="tabular">{formatQuantity(c.quantity, c.item.unit)}</td>
                      <td className="tabular">
                        {c.unitCost != null ? formatCurrency(c.unitCost) : <span className="muted">—</span>}
                      </td>
                      <td className="tabular">
                        {c.unitCost != null ? formatCurrency(c.unitCost * c.quantity) : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>{t("prod.materialsCost")}</td>
                    <td className="tabular">{formatCurrency(batch.materialCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {batch.status !== "CANCELLED" ? (
            addingMaterials ? (
              <div className="form-stack" style={{ marginTop: 12 }}>
                {addingMaterials.map((line, i) => (
                  <MaterialLineEditor
                    key={i}
                    materialItems={materialItems}
                    line={line}
                    onChange={(l) => setAddingMaterials((prev) => prev!.map((x, xi) => (xi === i ? l : x)))}
                    onRemove={() => setAddingMaterials((prev) => prev!.filter((_, xi) => xi !== i))}
                  />
                ))}
                <div className="row-actions">
                  <Button variant="ghost" onClick={() => setAddingMaterials((prev) => [...prev!, emptyMaterialLine()])}>
                    {t("prod.addRow")}
                  </Button>
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() => {
                      const lines = addingMaterials.filter((l) => l.itemId && l.quantity > 0);
                      if (lines.length === 0) return setError(t("prod.err.materials"));
                      run(() =>
                        addConsumption(
                          batch.id,
                          lines.map((l) => ({
                            itemId: l.itemId,
                            quantity: l.quantity,
                            ...(l.stockBatchId ? { stockBatchId: l.stockBatchId } : {}),
                          })),
                        ),
                      ).then((ok) => ok && setAddingMaterials(null));
                    }}
                  >
                    {t("prod.saveConsumption")}
                  </Button>
                  <Button onClick={() => setAddingMaterials(null)}>{t("action.cancel")}</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setAddingMaterials([emptyMaterialLine()])}>
                {t("prod.addConsumption")}
              </Button>
            )
          ) : null}
        </section>

        <section>
          <h4 className="section-title">{t("prod.outputSection")}</h4>

          {batch.outputDeclared ? (
            <>
              <VarianceBreakdown
                expectedQuantity={batch.expectedQuantity}
                firstChoice={batch.firstChoice}
                secondChoice={batch.secondChoice}
                waste={batch.waste}
                unit={batch.product.unit}
              />
              <div className="detail-stats" style={{ marginBottom: 12 }}>
                <div className="stat-card">
                  <span className="stat-card-label">{t("prod.materialsCost")}</span>
                  <span className="stat-card-value">{formatCurrency(batch.materialCost)}</span>
                  <span className="stat-card-hint">
                    {batch.uncostedConsumptionCount > 0
                      ? t("prod.missingCosts", {
                          count: tn("prod.materialCount", batch.uncostedConsumptionCount),
                        })
                      : t("prod.materialsAtStockCost")}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-label">{t("prod.unitMaterialCost")}</span>
                  <span className="stat-card-value">
                    {batch.unitMaterialCost !== null ? formatCurrency(batch.unitMaterialCost) : "—"}
                  </span>
                  <span className="stat-card-hint">
                    {t("prod.spreadNoWaste")}
                  </span>
                </div>
              </div>

              <Banner tone="warn">
                {t("prod.materialCostOnly")}
              </Banner>

              <div className="rate-row">
                <RateItem label={t("prod.yieldRate")} value={formatRate(batch.rates.yieldRate)} />
                <RateItem label={t("prod.secondRate")} value={formatRate(batch.rates.secondChoiceRate)} />
                <RateItem label={t("prod.wasteRate")} value={formatRate(batch.rates.wasteRate)} />
                <RateItem
                  label={t("prod.unknownRate")}
                  value={formatRate(batch.rates.unknownRate)}
                  tone={batch.unknown ? "danger" : "ok"}
                />
              </div>
            </>
          ) : (
            <div className="form-stack">
              <Banner tone="info">
                {t("prod.outputNotDeclaredYet")}
              </Banner>
              {canDeclare ? (
                <>
                  <div className="output-grid">
                    <Field label={t("prod.expectedShort")} hint={t("prod.expectedCorrectHint")}>
                      <input className="input" type="number" min={0} value={expectedOverride} onChange={(e) => setExpectedOverride(e.target.value)} />
                    </Field>
                    <Field label={t("quality.first")}>
                      <input className="input" type="number" min={0} value={firstChoice} onChange={(e) => setFirstChoice(e.target.value)} />
                    </Field>
                    <Field label={t("quality.second")}>
                      <input className="input" type="number" min={0} value={secondChoice} onChange={(e) => setSecondChoice(e.target.value)} />
                    </Field>
                    <Field label={t("quality.reject")}>
                      <input className="input" type="number" min={0} value={waste} onChange={(e) => setWaste(e.target.value)} />
                    </Field>
                  </div>
                  <VarianceBreakdown
                    expectedQuantity={expected}
                    firstChoice={Number(firstChoice) || 0}
                    secondChoice={Number(secondChoice) || 0}
                    waste={Number(waste) || 0}
                    unit={batch.product.unit}
                  />
                  {draftUnknown !== 0 ? (
                    <Field label={t("prod.varianceNote")}>
                      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("prod.ph.varianceNote")} />
                    </Field>
                  ) : null}
                  <div>
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          declareOutput(batch.id, {
                            firstChoice: Number(firstChoice) || 0,
                            secondChoice: Number(secondChoice) || 0,
                            waste: Number(waste) || 0,
                            expectedQuantity: expected,
                            ...(note.trim() ? { varianceNote: note.trim() } : {}),
                          }),
                        )
                      }
                    >
                      {busy ? t("action.saving") : t("prod.declareOutput")}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </section>

        {batch.outputDeclared && batch.unknown !== null && batch.unknown !== 0 ? (
          <section>
            <h4 className="section-title">{t("prod.varianceSection")}</h4>
            <Banner tone={batch.needsInvestigation ? "danger" : "info"}>
              {batch.needsInvestigation
                ? t("prod.varianceNeedsCheck", {
                    quantity: Math.abs(batch.unknown),
                    unit: batch.product.unit,
                    direction: t(batch.unknown > 0 ? "prod.varianceMissing" : "prod.varianceSurplus"),
                  })
                : t("prod.varianceJustified")}
            </Banner>
            <Field label={t("prod.investigationConclusion")}>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("prod.ph.conclusion")} />
            </Field>
            <div className="row-actions">
              <Button variant="primary" disabled={busy || !note.trim()} onClick={() => run(() => updateBatch(batch.id, { varianceNote: note.trim() }))}>
                {t("prod.saveConclusion")}
              </Button>
            </div>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="batch-meta-item">
      <span className="batch-meta-label">{label}</span>
      <span className="batch-meta-value">{value}</span>
    </div>
  );
}

function RateItem({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "ok" | "danger" }) {
  return (
    <div className={`rate-item rate-item-${tone}`}>
      <span className="rate-item-label">{label}</span>
      <span className="rate-item-value tabular">{value}</span>
    </div>
  );
}
