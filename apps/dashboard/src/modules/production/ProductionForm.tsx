import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import type { ApiItem } from "../../lib/stockApi";
import { logUsage, receiveStock } from "../../lib/stockApi";
import { todayIso } from "../../lib/date";
import { newId } from "../../lib/id";
import { MaterialLineEditor } from "./MaterialLineEditor";
import { GAP_REASONS, SHIFTS, type MaterialLineRecord, type ProductionRun } from "./types";

const emptyLine = (): MaterialLineRecord => ({ itemId: "", itemName: "", unit: "", quantity: 0, batchId: null, batchNumber: null });

interface ProductionFormProps {
  materialItems: ApiItem[];
  finishedGoodsItems: ApiItem[];
  onSaved: (run: ProductionRun) => void;
  onStockChanged: () => void;
}

export function ProductionForm({ materialItems, finishedGoodsItems, onSaved, onStockChanged }: ProductionFormProps) {
  const [date, setDate] = useState(todayIso());
  const [productItemId, setProductItemId] = useState("");
  const [worker, setWorker] = useState("");
  const [machine, setMachine] = useState("");
  const [shift, setShift] = useState(SHIFTS[0]);
  const [materials, setMaterials] = useState<MaterialLineRecord[]>([emptyLine()]);
  const [premierChoix, setPremierChoix] = useState("");
  const [deuxiemeChoix, setDeuxiemeChoix] = useState("");
  const [rebut, setRebut] = useState("");
  const [machineQuantity, setMachineQuantity] = useState("");
  const [gapReason, setGapReason] = useState(GAP_REASONS[0]);
  const [gapReasonCustom, setGapReasonCustom] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [partialFailure, setPartialFailure] = useState<string | null>(null);

  const totalCounted = (Number(premierChoix) || 0) + (Number(deuxiemeChoix) || 0) + (Number(rebut) || 0);
  const gap = (Number(machineQuantity) || 0) - totalCounted;
  const hasCounts = premierChoix !== "" || deuxiemeChoix !== "" || rebut !== "" || machineQuantity !== "";

  const activeMaterialLines = useMemo(() => materials.filter((m) => m.itemId && m.quantity > 0), [materials]);

  function updateLine(index: number, line: MaterialLineRecord) {
    setMaterials((prev) => prev.map((l, i) => (i === index ? line : l)));
  }

  function removeLine(index: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setProductItemId("");
    setWorker("");
    setMachine("");
    setMaterials([emptyLine()]);
    setPremierChoix("");
    setDeuxiemeChoix("");
    setRebut("");
    setMachineQuantity("");
    setGapReason(GAP_REASONS[0]);
    setGapReasonCustom("");
  }

  async function handleSubmit() {
    setFormError(null);
    setPartialFailure(null);

    const product = finishedGoodsItems.find((i) => i.id === productItemId);
    if (!product) {
      setFormError("Choisissez le produit fabriqué.");
      return;
    }
    if (!worker.trim() || !machine.trim()) {
      setFormError("Le nom de l'ouvrier et la machine/ligne sont obligatoires.");
      return;
    }
    for (const line of materials) {
      if (line.itemId && line.quantity <= 0) {
        setFormError(`Indiquez une quantité pour "${line.itemName}", ou retirez cette ligne.`);
        return;
      }
    }
    const premier = Number(premierChoix) || 0;
    const deuxieme = Number(deuxiemeChoix) || 0;
    const rebutValue = Number(rebut) || 0;
    const machineQty = Number(machineQuantity) || 0;
    if (gap !== 0 && (!gapReason || (gapReason === "Autre" && !gapReasonCustom.trim()))) {
      setFormError("Un écart a été détecté — précisez la raison avant d'enregistrer.");
      return;
    }

    setSubmitting(true);
    const completed: string[] = [];
    setCompletedSteps([]);

    try {
      for (const line of activeMaterialLines) {
        await logUsage(line.itemId, { quantity: line.quantity, date, reason: "Production", batchId: line.batchId ?? undefined });
        completed.push(`${line.itemName} : -${line.quantity} ${line.unit}`);
        setCompletedSteps([...completed]);
      }

      if (premier + deuxieme > 0) {
        await receiveStock(product.id, { quantity: premier + deuxieme, date, supplierId: null });
        completed.push(`${product.name} : +${premier + deuxieme} ${product.unit} (produits finis)`);
        setCompletedSteps([...completed]);
      }

      const run: ProductionRun = {
        id: newId("run"),
        date,
        productItemId: product.id,
        productName: product.name,
        worker: worker.trim(),
        machine: machine.trim(),
        shift,
        materials: activeMaterialLines,
        premierChoix: premier,
        deuxiemeChoix: deuxieme,
        rebut: rebutValue,
        machineQuantity: machineQty,
        gap,
        gapReason: gap !== 0 ? (gapReason === "Autre" ? gapReasonCustom.trim() : gapReason) : null,
        createdAt: new Date().toISOString(),
      };

      onSaved(run);
      onStockChanged();
      resetForm();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Une erreur est survenue.";
      setPartialFailure(
        completed.length > 0
          ? `Échec après ${completed.length} étape(s) déjà appliquée(s) au stock : ${message} Vérifiez le stock avant de réessayer — voir PROJECT_CONTEXT.md, section Production, pour pourquoi ceci n'est pas encore garanti atomique.`
          : `Échec : ${message}`,
      );
      onStockChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-section">
      <h3>Nouvelle production</h3>

      <div className="form-row">
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Produit fabriqué" hint={finishedGoodsItems.length === 0 ? "Ajoutez d'abord un produit fini dans l'onglet Stock" : undefined}>
          <select className="input" value={productItemId} onChange={(e) => setProductItemId(e.target.value)}>
            <option value="">— Choisir —</option>
            {finishedGoodsItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="form-row">
        <Field label="Ouvrier">
          <input className="input" value={worker} onChange={(e) => setWorker(e.target.value)} placeholder="Nom de l'ouvrier" />
        </Field>
        <Field label="Machine / ligne">
          <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="Ex. Ligne 2" />
        </Field>
        <Field label="Équipe">
          <select className="input" value={shift} onChange={(e) => setShift(e.target.value)}>
            {SHIFTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <p className="field-label" style={{ marginBottom: 8 }}>
          Matières consommées
        </p>
        {materials.map((line, i) => (
          <MaterialLineEditor key={i} materialItems={materialItems} line={line} onChange={(l) => updateLine(i, l)} onRemove={() => removeLine(i)} />
        ))}
        <Button variant="ghost" onClick={() => setMaterials((prev) => [...prev, emptyLine()])} style={{ marginTop: 8 }}>
          + Ajouter une matière
        </Button>
      </div>

      <div>
        <p className="field-label" style={{ marginBottom: 8 }}>
          Sortie de production (comptée à la machine)
        </p>
        <div className="output-grid">
          <Field label="1er choix">
            <input className="input" type="number" min={0} value={premierChoix} onChange={(e) => setPremierChoix(e.target.value)} />
          </Field>
          <Field label="2ème choix">
            <input className="input" type="number" min={0} value={deuxiemeChoix} onChange={(e) => setDeuxiemeChoix(e.target.value)} />
          </Field>
          <Field label="Rebut">
            <input className="input" type="number" min={0} value={rebut} onChange={(e) => setRebut(e.target.value)} />
          </Field>
          <Field label="Quantité machine" hint="Annoncée par le compteur de la machine">
            <input className="input" type="number" min={0} value={machineQuantity} onChange={(e) => setMachineQuantity(e.target.value)} />
          </Field>
        </div>
      </div>

      {hasCounts && (
        <div className="reconciliation">
          <div className="reconciliation-figure">
            <span className="label">Machine</span>
            <span className="value tabular">{Number(machineQuantity) || 0}</span>
          </div>
          <div className="reconciliation-figure">
            <span className="label">Comptabilisé</span>
            <span className="value tabular">{totalCounted}</span>
          </div>
          <div className={`reconciliation-figure ${gap === 0 ? "gap-zero" : "gap-nonzero"}`}>
            <span className="label">Écart</span>
            <span className="value tabular">
              {gap === 0 ? "0 ✓" : gap > 0 ? `${gap} non justifiés` : `${Math.abs(gap)} en trop`}
            </span>
          </div>
        </div>
      )}

      {gap !== 0 && hasCounts ? (
        <div className="form-row">
          <Field label="Raison de l'écart">
            <select className="input" value={gapReason} onChange={(e) => setGapReason(e.target.value)}>
              {GAP_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          {gapReason === "Autre" ? (
            <Field label="Préciser">
              <input className="input" value={gapReasonCustom} onChange={(e) => setGapReasonCustom(e.target.value)} />
            </Field>
          ) : null}
        </div>
      ) : null}

      {formError ? <p className="form-error">{formError}</p> : null}
      {partialFailure ? <Banner tone="danger">{partialFailure}</Banner> : null}
      {submitting && completedSteps.length > 0 ? (
        <Banner tone="info">Enregistrement en cours… déjà fait : {completedSteps.join(" · ")}</Banner>
      ) : null}

      <div>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Enregistrement…" : "Enregistrer la production"}
        </Button>
      </div>
    </div>
  );
}
