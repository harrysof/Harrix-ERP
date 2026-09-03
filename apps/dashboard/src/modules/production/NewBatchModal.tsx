import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { Rich } from "../../components/ui/Rich";
import { useI18n } from "../../state/LanguageContext";
import type { ApiItem } from "../../lib/stockApi";
import { createBatch, type CreateBatchInput } from "../../lib/productionApi";
import { todayIso } from "../../lib/date";
import { MaterialLineEditor } from "./MaterialLineEditor";
import { VarianceBreakdown } from "./VarianceBreakdown";
import { SHIFTS, emptyMaterialLine, materialLinesCost, unpricedLines, type MaterialLine } from "./types";
import { formatCurrency } from "../../lib/format";

interface NewBatchModalProps {
  materialItems: ApiItem[];
  finishedGoodsItems: ApiItem[];
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Opens a production batch. Output can be declared here (the gérant recording
 * a finished shift after the fact) or left for later (a batch opened at the
 * start of a shift, which the worker's satellite app will finish).
 *
 * Either way this is ONE request: the backend consumes the materials, credits
 * the finished goods and writes the batch inside a single transaction, so a
 * failure can no longer leave stock half-moved (PROJECT_CONTEXT.md §8.3).
 */
export function NewBatchModal({ materialItems, finishedGoodsItems, onClose, onCreated }: NewBatchModalProps) {
  const { t, tn } = useI18n();
  const [date, setDate] = useState(todayIso());
  const [productItemId, setProductItemId] = useState("");
  const [machine, setMachine] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [operator, setOperator] = useState("");
  const [shift, setShift] = useState(SHIFTS[0].value);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<MaterialLine[]>([emptyMaterialLine()]);

  const [declareNow, setDeclareNow] = useState(true);
  const [firstChoice, setFirstChoice] = useState("");
  const [secondChoice, setSecondChoice] = useState("");
  const [waste, setWaste] = useState("");
  const [varianceNote, setVarianceNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const expected = Number(expectedQuantity) || 0;
  const first = Number(firstChoice) || 0;
  const second = Number(secondChoice) || 0;
  const wasteValue = Number(waste) || 0;
  const unknown = expected - first - second - wasteValue;
  const product = finishedGoodsItems.find((i) => i.id === productItemId);

  // What this batch costs in raw materials, and what that works out to per
  // finished unit. The same arithmetic the backend performs when it writes
  // the batch — shown here so the cost is visible before it is committed,
  // not discovered afterwards.
  const materialCost = materialLinesCost(materials);
  const sellable = first + second;
  const unitMaterialCost = declareNow && sellable > 0 ? materialCost / sellable : null;
  const missingCosts = unpricedLines(materials);

  async function handleSubmit() {
    setError(null);

    if (!productItemId) return setError(t("prod.err.product"));
    if (!machine.trim()) return setError(t("prod.err.machineLine"));
    if (expected <= 0) return setError(t("prod.err.expectedAnnounced"));
    for (const line of materials) {
      if (line.itemId && line.quantity <= 0) {
        return setError(t("prod.err.lineQuantity", { item: line.itemName }));
      }
    }

    const input: CreateBatchInput = {
      date,
      productItemId,
      machine: machine.trim(),
      shift,
      expectedQuantity: expected,
      ...(supervisor.trim() ? { supervisor: supervisor.trim() } : {}),
      ...(operator.trim() ? { operator: operator.trim() } : {}),
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      consumptions: materials
        .filter((l) => l.itemId && l.quantity > 0)
        .map((l) => ({ itemId: l.itemId, quantity: l.quantity, ...(l.stockBatchId ? { stockBatchId: l.stockBatchId } : {}) })),
      ...(declareNow
        ? {
            output: {
              firstChoice: first,
              secondChoice: second,
              waste: wasteValue,
              ...(varianceNote.trim() ? { varianceNote: varianceNote.trim() } : {}),
            },
          }
        : {}),
    };

    setSaving(true);
    try {
      await createBatch(input);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={t("prod.newBatchTitle")}
      onClose={onClose}
      width={860}
      footer={
        <>
          <Button onClick={onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t("action.saving") : t("prod.saveBatch")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={t("field.date")}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field
            label={t("prod.productMade")}
            hint={finishedGoodsItems.length === 0 ? t("prod.addFinishedGoodHint") : undefined}
          >
            <select className="input" value={productItemId} onChange={(e) => setProductItemId(e.target.value)}>
              <option value="">{t("prod.choose")}</option>
              {finishedGoodsItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("prod.expectedShort")} hint={t("prod.expectedShortHint")}>
            <input className="input" type="number" min={0} value={expectedQuantity} onChange={(e) => setExpectedQuantity(e.target.value)} />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t("prod.machineLine")}>
            <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder={t("prod.ph.machine")} />
          </Field>
          <Field label={t("prod.shift")}>
            <select className="input" value={shift} onChange={(e) => setShift(e.target.value)}>
              {SHIFTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.key)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("prod.start")}>
            <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label={t("prod.end")}>
            <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t("prod.supervisor")}>
            <input className="input" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder={t("prod.ph.supervisor")} />
          </Field>
          <Field label={t("prod.operator")}>
            <input className="input" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder={t("prod.ph.operator")} />
          </Field>
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            {t("prod.materials")}
          </p>
          {materials.map((line, i) => (
            <MaterialLineEditor
              key={i}
              materialItems={materialItems}
              line={line}
              onChange={(l) => setMaterials((prev) => prev.map((x, xi) => (xi === i ? l : x)))}
              onRemove={() => setMaterials((prev) => prev.filter((_, xi) => xi !== i))}
            />
          ))}
          <Button variant="ghost" onClick={() => setMaterials((prev) => [...prev, emptyMaterialLine()])} style={{ marginTop: 8 }}>
            {t("prod.addMaterial")}
          </Button>

          {materialCost > 0 || missingCosts.length > 0 ? (
            <div className="detail-stats" style={{ marginTop: 12 }}>
              <div className="stat-card">
                <span className="stat-card-label">{t("prod.materialsCost")}</span>
                <span className="stat-card-value">{formatCurrency(materialCost)}</span>
                <span className="stat-card-hint">
                  {missingCosts.length > 0
                    ? t("prod.missingCosts", { count: tn("prod.materialCount", missingCosts.length) })
                    : t("prod.materialCostSum")}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">{t("prod.unitMaterialCost")}</span>
                <span className="stat-card-value">{unitMaterialCost !== null ? formatCurrency(unitMaterialCost) : "—"}</span>
                <span className="stat-card-hint">
                  {t(unitMaterialCost !== null ? "prod.spreadOverSellable" : "prod.availableAfterOutput")}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={declareNow} onChange={(e) => setDeclareNow(e.target.checked)} />
          <span>
            {t("prod.declareNow")}
            <span className="checkbox-hint">{t("prod.declareNowHint")}</span>
          </span>
        </label>

        {declareNow ? (
          <>
            <div className="output-grid">
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
              firstChoice={first}
              secondChoice={second}
              waste={wasteValue}
              unit={product?.unit}
            />

            {unknown !== 0 && expected > 0 ? (
              <Field
                label={t("prod.varianceNote")}
                hint={t("prod.varianceNoteHint")}
              >
                <input
                  className="input"
                  value={varianceNote}
                  onChange={(e) => setVarianceNote(e.target.value)}
                  placeholder={t("prod.ph.varianceNote")}
                />
              </Field>
            ) : null}
          </>
        ) : null}

        <Field label={t("field.notes")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("prod.ph.notes")} />
        </Field>

        <Banner tone="info">
          {t("prod.stockEffect")}
        </Banner>

        {materialCost > 0 ? (
          <Banner tone="warn">
            <Rich
              text={t("prod.rawMaterialsOnly")}
              parts={{ lead: <strong>{t("prod.rawMaterialsOnlyLead")}</strong> }}
            />
          </Banner>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
