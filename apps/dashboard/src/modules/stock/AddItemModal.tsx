import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { InventoryTypeConfig } from "../../lib/types";
import type { ApiItem } from "../../lib/stockApi";
import { formatCurrency, formatQuantity } from "../../lib/format";
import { UnitSelect } from "../../components/ui/UnitSelect";
import { isValidUnit } from "../../lib/units";
import { todayIso } from "../../lib/date";
import { Banner } from "../../components/ui/Banner";

interface AddItemModalProps {
  inventoryType: InventoryTypeConfig;
  item?: ApiItem | null;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    reference: string;
    unit: string;
    reorderThreshold: number;
    photoUrl?: string | null;
    color?: string | null;
    size?: string | null;
    description?: string | null;
    machine?: string | null;
    compatibility?: string | null;
    manufacturer?: string | null;
    location?: string | null;
    criticality?: string | null;
    gender?: string | null;
    price?: number | null;
    unitCost?: number | null;
    /**
     * Stock already on the shelf when the article is created. Optional, and
     * offered only on creation: it is not a column on the article, it is a
     * first reception the caller posts right after — quantity only ever comes
     * from the ledger (PROJECT_CONTEXT.md §4).
     */
    initialStock?: { quantity: number; date: string; batchNumber?: string; expiryDate?: string } | null;
  }) => Promise<void> | void;
}

export function AddItemModal({ inventoryType, item, onClose, onSubmit }: AddItemModalProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [reference, setReference] = useState(item?.reference ?? "");
  const [unit, setUnit] = useState(item?.unit ?? inventoryType.defaultUnit);
  const [threshold, setThreshold] = useState(String(item?.reorderThreshold ?? 0));
  const [photoUrl, setPhotoUrl] = useState(item?.photoUrl ?? "");
  const [color, setColor] = useState(item?.color ?? "");
  const [size, setSize] = useState(item?.size ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [machine, setMachine] = useState(item?.machine ?? "");
  const [compatibility, setCompatibility] = useState(item?.compatibility ?? "");
  const [manufacturer, setManufacturer] = useState(item?.manufacturer ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [criticality, setCriticality] = useState(item?.criticality ?? "");
  const [gender, setGender] = useState(item?.gender ?? "");
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : "");
  const [unitCost, setUnitCost] = useState(item?.unitCost != null ? String(item.unitCost) : "");
  // Opening stock, on creation only. Editing an article must never move stock:
  // that is what a réception or a sortie is for, and each leaves a ledger row.
  const [initialQuantity, setInitialQuantity] = useState("");
  const [initialDate, setInitialDate] = useState(todayIso());
  const [initialBatch, setInitialBatch] = useState("");
  const [initialExpiry, setInitialExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !reference.trim()) {
      setError("Le nom et la référence sont obligatoires.");
      return;
    }
    if (!isValidUnit(unit)) {
      setError("Choisissez une unité de mesure (kg, litre, pièce…). Un nombre n'est pas une unité.");
      return;
    }
    const thresholdValue = Number(threshold);
    if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
      setError("Le seuil de réapprovisionnement doit être un nombre positif.");
      return;
    }
    const priceValue = price === "" ? null : Number(price);
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      setError("Le prix doit être un nombre positif (DZD).");
      return;
    }
    const unitCostValue = unitCost === "" ? null : Number(unitCost);
    if (unitCostValue !== null && (!Number.isFinite(unitCostValue) || unitCostValue < 0)) {
      setError("Le coût unitaire doit être un nombre positif (DZD).");
      return;
    }
    const quantityValue = initialQuantity === "" ? 0 : Number(initialQuantity);
    if (initialQuantity !== "" && (!Number.isFinite(quantityValue) || quantityValue < 0)) {
      setError("La quantité initiale doit être un nombre positif.");
      return;
    }
    if (quantityValue > 0) {
      if (inventoryType.hasBatches && !initialBatch.trim()) {
        setError("Indiquez le numéro de lot de ce stock initial — cet inventaire est suivi par lot.");
        return;
      }
      if (inventoryType.hasExpiry && !initialExpiry) {
        setError("Indiquez la date de péremption de ce stock initial.");
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim(),
        reorderThreshold: thresholdValue,
        photoUrl: photoUrl.trim() || null,
        color: color.trim() || null,
        size: size.trim() || null,
        description: description.trim() || null,
        machine: machine.trim() || null,
        compatibility: compatibility.trim() || null,
        manufacturer: manufacturer.trim() || null,
        location: location.trim() || null,
        criticality: criticality || null,
        gender: gender || null,
        price: priceValue,
        unitCost: unitCostValue,
        initialStock:
          quantityValue > 0
            ? {
                quantity: quantityValue,
                date: initialDate,
                ...(inventoryType.hasBatches ? { batchNumber: initialBatch.trim() } : {}),
                ...(inventoryType.hasExpiry ? { expiryDate: initialExpiry } : {}),
              }
            : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  // What the article is worth at the cost just typed, at today's quantity —
  // the point of entering a cost, shown before the form is even saved.
  const unitCostNumber = Number(unitCost);
  const initialQuantityNumber = Number(initialQuantity);
  // What the opening stock is worth at the cost typed above — the two fields
  // only mean something together.
  const initialValue =
    initialQuantity !== "" && Number.isFinite(initialQuantityNumber) && initialQuantityNumber > 0 && Number.isFinite(unitCostNumber) && unitCost !== ""
      ? initialQuantityNumber * unitCostNumber
      : null;
  const unitCostPreview =
    unitCost !== "" && Number.isFinite(unitCostNumber) && unitCostNumber >= 0 && item && item.quantity > 0
      ? `${formatQuantity(item.quantity, item.unit)} en stock — ${formatCurrency(item.quantity * unitCostNumber)}`
      : null;

  return (
    <Modal
      title={item ? `Modifier — ${item.name}` : `Nouvel article — ${inventoryType.label}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : item ? "Enregistrer" : "Ajouter l'article"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ex. ${inventoryType.singular}`} autoFocus />
        </Field>
        <Field label="Référence">
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. CH-004" />
        </Field>
        <div className="form-row">
          <Field label="Unité" hint="Ce en quoi l'article se compte — la quantité et le coût s'expriment par unité">
            <UnitSelect value={unit} onChange={setUnit} />
          </Field>
          <Field label="Seuil de réapprovisionnement" hint="Alerte quand le stock descend à ce niveau ou en dessous">
            <input className="input" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
        </div>
        <Field
          label={`Coût unitaire (DZD / ${unit.trim() || inventoryType.defaultUnit})`}
          hint="Ce que coûte une unité à l'achat. Sert de valeur par défaut aux réceptions et à valoriser le stock : la valeur affichée est la moyenne de ce qui a réellement été payé."
        >
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="Ex. 1200"
          />
          {unitCostPreview ? <span className="field-hint">{unitCostPreview}</span> : null}
        </Field>
        {(inventoryType.hasColor || inventoryType.hasSize) && (
          <div className="form-row">
            {inventoryType.hasColor && (
              <Field label="Couleur">
                <input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ex. Noir" />
              </Field>
            )}
            {inventoryType.hasSize && (
              <Field label="Taille">
                <input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Ex. 42" />
              </Field>
            )}
          </div>
        )}
        {(inventoryType.hasGender || inventoryType.hasPrice) && (
          <div className="form-row">
            {inventoryType.hasGender && (
              <Field label="Sexe">
                <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">— Non précisé —</option>
                  <option value="M">M (Homme)</option>
                  <option value="F">F (Femme)</option>
                </select>
              </Field>
            )}
            {inventoryType.hasPrice && (
              <Field label="Prix de vente (DZD)" hint="Ce à quoi l'article est vendu — distinct du coût unitaire ci-dessus">
                <input className="input" type="number" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex. 4500" />
              </Field>
            )}
          </div>
        )}
        {inventoryType.hasDescription && (
          <Field label="Description" hint="Usage, remplaçabilité… — informatif">
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        )}
        {inventoryType.hasMachineInfo && (
          <>
            <p className="detail-type" style={{ margin: 0 }}>
              Machine &amp; compatibilité
            </p>
            <div className="form-row">
              <Field label="Machine">
                <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="Ex. Machine à coudre N°3" />
              </Field>
              <Field label="Compatibilité">
                <input className="input" value={compatibility} onChange={(e) => setCompatibility(e.target.value)} placeholder="Ex. Piqueuses Adler" />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Fabricant">
                <input className="input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Ex. SKF" />
              </Field>
              <Field label="Localisation">
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. Atelier — armoire B2" />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Criticité" hint="Impact d'une rupture de stock sur la production">
                <select className="input" value={criticality} onChange={(e) => setCriticality(e.target.value)}>
                  <option value="">— Non précisée —</option>
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </Field>
            </div>
          </>
        )}
        {!item ? (
          <>
            <p className="detail-type" style={{ margin: 0 }}>
              Stock déjà en place
            </p>
            <div className="form-row">
              <Field
                label={`Quantité initiale (${unit.trim() || inventoryType.defaultUnit})`}
                hint="Ce que vous avez déjà en magasin aujourd'hui. Laissez vide si l'article n'est pas encore approvisionné."
              >
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  placeholder="Ex. 100"
                />
              </Field>
              <Field label="Date" hint="Date à laquelle ce stock est constaté">
                <input className="input" type="date" value={initialDate} onChange={(e) => setInitialDate(e.target.value)} />
              </Field>
            </div>

            {Number(initialQuantity) > 0 && (inventoryType.hasBatches || inventoryType.hasExpiry) ? (
              <div className="form-row">
                {inventoryType.hasBatches ? (
                  <Field label="Numéro de lot">
                    <input className="input" value={initialBatch} onChange={(e) => setInitialBatch(e.target.value)} placeholder="Ex. L-2501" />
                  </Field>
                ) : null}
                {inventoryType.hasExpiry ? (
                  <Field label="Date de péremption">
                    <input className="input" type="date" value={initialExpiry} onChange={(e) => setInitialExpiry(e.target.value)} />
                  </Field>
                ) : null}
              </div>
            ) : null}

            {initialValue !== null ? (
              <Banner tone="info">
                Ce stock initial est enregistré comme une <strong>réception</strong> : {formatQuantity(Number(initialQuantity), unit.trim() || inventoryType.defaultUnit)}{" "}
                valorisés à {formatCurrency(initialValue)}. Pour une livraison avec fournisseur, utilisez le bouton « Réception » de la
                ligne — la quantité d'un article vient toujours de ses mouvements, jamais d'une case qu'on réécrit.
              </Banner>
            ) : null}
          </>
        ) : null}

        <Field
          label="Photo (URL)"
          hint="Adresse d'une image (https…) ou image intégrée (données data:image/…). Facultatif."
        >
          {photoUrl ? (
            <div className="field-photo-preview">
              <img src={photoUrl} alt="" />
            </div>
          ) : null}
          <input className="input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://… ou data:image/…" />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
