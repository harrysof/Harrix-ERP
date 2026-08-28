import { useState, type ReactNode } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDate, formatQuantity } from "../../lib/format";
import type { ApiItem } from "../../lib/stockApi";
import { addConsumption, declareOutput, updateBatch, STATUS_LABELS, type ApiProductionBatch } from "../../lib/productionApi";
import { MaterialLineEditor } from "./MaterialLineEditor";
import { VarianceBreakdown } from "./VarianceBreakdown";
import { STATUS_TONE, emptyMaterialLine, formatRate, type MaterialLine } from "./types";

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
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Lot ${batch.code}`} onClose={onClose} width={860} footer={<Button onClick={onClose}>Fermer</Button>}>
      <div className="form-stack">
        <div className="batch-meta">
          <MetaItem label="Statut" value={<Pill tone={STATUS_TONE[batch.status]}>{STATUS_LABELS[batch.status]}</Pill>} />
          <MetaItem label="Date" value={formatDate(batch.date)} />
          <MetaItem label="Produit" value={batch.product.name} />
          <MetaItem label="Machine" value={batch.machine} />
          <MetaItem label="Équipe" value={batch.shift} />
          <MetaItem label="Superviseur" value={batch.supervisor ?? "—"} />
          <MetaItem label="Opérateur" value={batch.operator ?? "—"} />
          <MetaItem label="Horaire" value={batch.startTime ? `${batch.startTime} → ${batch.endTime || "…"}` : "—"} />
        </div>

        {batch.notes ? <p className="batch-notes">{batch.notes}</p> : null}

        <section>
          <h4 className="section-title">Matières consommées</h4>
          {batch.consumptions.length === 0 ? (
            <EmptyState title="Aucune matière enregistrée" description="Ce lot n'a encore consommé aucune matière première." />
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Matière</th>
                    <th>Lot</th>
                    <th>Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.consumptions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.item.name}</td>
                      <td>{c.stockBatch ? c.stockBatch.batchNumber : <span className="muted">—</span>}</td>
                      <td className="tabular">{formatQuantity(c.quantity, c.item.unit)}</td>
                    </tr>
                  ))}
                </tbody>
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
                    + Ligne
                  </Button>
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() => {
                      const lines = addingMaterials.filter((l) => l.itemId && l.quantity > 0);
                      if (lines.length === 0) return setError("Ajoutez au moins une matière avec une quantité.");
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
                    Enregistrer la consommation
                  </Button>
                  <Button onClick={() => setAddingMaterials(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setAddingMaterials([emptyMaterialLine()])}>
                + Ajouter une consommation
              </Button>
            )
          ) : null}
        </section>

        <section>
          <h4 className="section-title">Sortie de production</h4>

          {batch.outputDeclared ? (
            <>
              <VarianceBreakdown
                expectedQuantity={batch.expectedQuantity}
                firstChoice={batch.firstChoice}
                secondChoice={batch.secondChoice}
                waste={batch.waste}
                unit={batch.product.unit}
              />
              <div className="rate-row">
                <RateItem label="Rendement (1er choix)" value={formatRate(batch.rates.yieldRate)} />
                <RateItem label="Taux 2ème choix" value={formatRate(batch.rates.secondChoiceRate)} />
                <RateItem label="Taux de rebut" value={formatRate(batch.rates.wasteRate)} />
                <RateItem label="Taux non comptabilisé" value={formatRate(batch.rates.unknownRate)} tone={batch.unknown ? "danger" : "ok"} />
              </div>
            </>
          ) : (
            <div className="form-stack">
              <Banner tone="info">
                La sortie de ce lot n'a pas encore été déclarée. Tant qu'elle ne l'est pas, l'écart n'est pas calculé — un lot non compté
                n'est pas un lot dont tout manque.
              </Banner>
              {canDeclare ? (
                <>
                  <div className="output-grid">
                    <Field label="Quantité attendue" hint="Corrigez si le compteur a été relevé après coup">
                      <input className="input" type="number" min={0} value={expectedOverride} onChange={(e) => setExpectedOverride(e.target.value)} />
                    </Field>
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
                    firstChoice={Number(firstChoice) || 0}
                    secondChoice={Number(secondChoice) || 0}
                    waste={Number(waste) || 0}
                    unit={batch.product.unit}
                  />
                  {draftUnknown !== 0 ? (
                    <Field label="Note sur l'écart (facultatif)">
                      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. compteur machine recalibré" />
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
                      {busy ? "Enregistrement…" : "Déclarer la sortie"}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </section>

        {batch.outputDeclared && batch.unknown !== null && batch.unknown !== 0 ? (
          <section>
            <h4 className="section-title">Écart de production</h4>
            <Banner tone={batch.needsInvestigation ? "danger" : "info"}>
              {batch.needsInvestigation
                ? `${Math.abs(batch.unknown)} ${batch.product.unit} ${batch.unknown > 0 ? "ne sont pas comptabilisées" : "sont en excédent"}. Une vérification est nécessaire — notez ci-dessous ce que l'investigation a établi.`
                : "Cet écart a été justifié."}
            </Banner>
            <Field label="Conclusion de l'investigation">
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce que la vérification a établi" />
            </Field>
            <div className="row-actions">
              <Button variant="primary" disabled={busy || !note.trim()} onClick={() => run(() => updateBatch(batch.id, { varianceNote: note.trim() }))}>
                Enregistrer la conclusion
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
