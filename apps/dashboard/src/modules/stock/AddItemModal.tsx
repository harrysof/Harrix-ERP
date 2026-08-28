import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { InventoryTypeConfig } from "../../lib/types";
import type { ApiItem } from "../../lib/stockApi";

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !reference.trim()) {
      setError("Le nom et la référence sont obligatoires.");
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
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        reference: reference.trim(),
        unit: unit.trim() || inventoryType.defaultUnit,
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
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

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
          <Field label="Unité">
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </Field>
          <Field label="Seuil de réapprovisionnement" hint="Alerte quand le stock descend à ce niveau ou en dessous">
            <input className="input" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
        </div>
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
              <Field label="Prix (DZD)" hint="Prix de vente unitaire">
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
