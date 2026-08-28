import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import type { ApiItem } from "../../lib/stockApi";
import { createBatch, type CreateBatchInput } from "../../lib/productionApi";
import { todayIso } from "../../lib/date";
import { MaterialLineEditor } from "./MaterialLineEditor";
import { VarianceBreakdown } from "./VarianceBreakdown";
import { SHIFTS, emptyMaterialLine, type MaterialLine } from "./types";

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
  const [date, setDate] = useState(todayIso());
  const [productItemId, setProductItemId] = useState("");
  const [machine, setMachine] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [operator, setOperator] = useState("");
  const [shift, setShift] = useState(SHIFTS[0]);
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

  async function handleSubmit() {
    setError(null);

    if (!productItemId) return setError("Choisissez le produit fabriqué.");
    if (!machine.trim()) return setError("Indiquez la machine ou la ligne de production.");
    if (expected <= 0) return setError("Indiquez la quantité attendue annoncée par la machine.");
    for (const line of materials) {
      if (line.itemId && line.quantity <= 0) {
        return setError(`Indiquez une quantité pour « ${line.itemName} », ou retirez cette ligne.`);
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
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nouveau lot de production"
      onClose={onClose}
      width={860}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le lot"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field
            label="Produit fabriqué"
            hint={finishedGoodsItems.length === 0 ? "Ajoutez d'abord un produit fini dans l'onglet Stock" : undefined}
          >
            <select className="input" value={productItemId} onChange={(e) => setProductItemId(e.target.value)}>
              <option value="">— Choisir —</option>
              {finishedGoodsItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantité attendue" hint="Annoncée par le compteur de la machine">
            <input className="input" type="number" min={0} value={expectedQuantity} onChange={(e) => setExpectedQuantity(e.target.value)} />
          </Field>
        </div>

        <div className="form-row">
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
          <Field label="Début">
            <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Fin">
            <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <div className="form-row">
          <Field label="Superviseur">
            <input className="input" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Responsable du lot" />
          </Field>
          <Field label="Opérateur">
            <input className="input" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Ouvrier à la machine" />
          </Field>
        </div>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Matières consommées
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
            + Ajouter une matière
          </Button>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={declareNow} onChange={(e) => setDeclareNow(e.target.checked)} />
          <span>
            Déclarer la sortie maintenant
            <span className="checkbox-hint">
              Décochez pour ouvrir le lot sans le clôturer — la sortie pourra être déclarée plus tard depuis sa fiche.
            </span>
          </span>
        </label>

        {declareNow ? (
          <>
            <div className="output-grid">
              <Field label="1er choix">
                <input className="input" type="number" min={0} value={firstChoice} onChange={(e) => setFirstChoice(e.target.value)} />
              </Field>
              <Field label="2ème choix">
                <input className="input" type="number" min={0} value={secondChoice} onChange={(e) => setSecondChoice(e.target.value)} />
              </Field>
              <Field label="Rebut">
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
                label="Note sur l'écart (facultatif)"
                hint="Sans note, le lot sera marqué « Investigation requise » jusqu'à ce que l'écart soit expliqué."
              >
                <input
                  className="input"
                  value={varianceNote}
                  onChange={(e) => setVarianceNote(e.target.value)}
                  placeholder="Ex. compteur machine recalibré"
                />
              </Field>
            ) : null}
          </>
        ) : null}

        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations sur le lot" />
        </Field>

        <Banner tone="info">
          Les matières sont déduites du stock et les produits finis (1er + 2ème choix) y sont ajoutés en une seule opération côté serveur. Le
          rebut est enregistré mais n'entre jamais dans le stock vendable.
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
