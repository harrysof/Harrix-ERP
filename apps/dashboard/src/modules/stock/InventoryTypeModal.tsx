import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import type { InventoryTypeConfig } from "../../lib/types";
import { UnitSelect } from "../../components/ui/UnitSelect";
import { isValidUnit } from "../../lib/units";

interface InventoryTypeModalProps {
  /** Present when editing an existing inventory; absent when adding one. */
  type?: InventoryTypeConfig | null;
  onClose: () => void;
  onSubmit: (input: InventoryTypeDraft) => Promise<void>;
}

export interface InventoryTypeDraft {
  key: string;
  label: string;
  singular: string;
  description: string;
  defaultUnit: string;
  hasBatches: boolean;
  hasExpiry: boolean;
  isProductionInput: boolean;
  hasColor: boolean;
  hasSize: boolean;
  hasDescription: boolean;
  hasMachineInfo: boolean;
  hasGender: boolean;
  hasPrice: boolean;
  hasQuality: boolean;
}

/** The switch fields — every draft key whose value is a boolean. */
type ToggleField = {
  [K in keyof InventoryTypeDraft]: InventoryTypeDraft[K] extends boolean ? K : never;
}[keyof InventoryTypeDraft];

/** Each switch, and what turning it on actually changes on the Stock screens. */
const OPTIONS: Array<{ field: ToggleField; label: string; hint: string }> = [
  { field: "hasBatches", label: "Suivi par lot", hint: "Chaque réception crée un lot numéroté, consommé en FIFO." },
  { field: "hasExpiry", label: "Péremption", hint: "Chaque lot porte une date d'expiration ; la consommation passe en FEFO." },
  { field: "isProductionInput", label: "Matière de production", hint: "Utilisable comme matière première dans un lot de production." },
  { field: "hasColor", label: "Couleur", hint: "Variante couleur sur chaque article." },
  { field: "hasSize", label: "Taille", hint: "Variante taille ou pointure." },
  { field: "hasDescription", label: "Description libre", hint: "Champ texte : usage, remplaçabilité…" },
  { field: "hasMachineInfo", label: "Infos machine", hint: "Machine, compatibilité, fabricant, localisation, criticité." },
  { field: "hasGender", label: "Sexe", hint: "Variante homme / femme." },
  { field: "hasPrice", label: "Prix de vente", hint: "Prix auquel l'article est vendu — distinct de son coût d'achat." },
  { field: "hasQuality", label: "Qualité de production", hint: "Classement 1er / 2ème choix / rebut, avec réconciliation des unités inconnues." },
];

/** "Emballages & cartons" → "emballages-cartons". */
function toKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Creates or edits an inventory — a Stock tab. The backend always stored these
 * as rows rather than a fixed enum, precisely so a factory could have a fifth
 * one (emballages, consommables, outillage) without a schema change; this is
 * the screen that finally makes that reachable.
 *
 * The machine key is generated from the label and frozen after creation:
 * articles, lots and movements all hang off the inventory, and a key that
 * moved would strand them.
 */
export function InventoryTypeModal({ type, onClose, onSubmit }: InventoryTypeModalProps) {
  const editing = Boolean(type);
  const [draft, setDraft] = useState<InventoryTypeDraft>({
    key: type?.key ?? "",
    label: type?.label ?? "",
    singular: type?.singular ?? "",
    description: type?.description ?? "",
    defaultUnit: type?.defaultUnit ?? "pièce",
    hasBatches: type?.hasBatches ?? false,
    hasExpiry: type?.hasExpiry ?? false,
    isProductionInput: type?.isProductionInput ?? false,
    hasColor: type?.hasColor ?? false,
    hasSize: type?.hasSize ?? false,
    hasDescription: type?.hasDescription ?? false,
    hasMachineInfo: type?.hasMachineInfo ?? false,
    hasGender: type?.hasGender ?? false,
    hasPrice: type?.hasPrice ?? false,
    hasQuality: type?.hasQuality ?? false,
  });
  const [keyTouched, setKeyTouched] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof InventoryTypeDraft>(field: K, value: InventoryTypeDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      // A péremption is tracked per lot: keeping the two switches consistent
      // here saves the user a rejected save for a rule they can't see.
      if (field === "hasExpiry" && value === true) next.hasBatches = true;
      if (field === "hasBatches" && value === false) next.hasExpiry = false;
      return next;
    });
  }

  function onLabelChange(label: string) {
    setDraft((prev) => ({
      ...prev,
      label,
      key: keyTouched ? prev.key : toKey(label),
      singular: prev.singular || "",
    }));
  }

  async function handleSubmit() {
    if (!draft.label.trim()) return setError("Le nom de l'inventaire est obligatoire.");
    if (!draft.singular.trim()) return setError("Indiquez le nom au singulier — il sert dans les messages de l'écran.");
    if (!isValidUnit(draft.defaultUnit)) {
      return setError("Choisissez une unité de mesure par défaut (kg, litre, pièce…). Un nombre n'est pas une unité.");
    }
    const key = draft.key.trim() || toKey(draft.label);
    if (!editing && !/^[a-z0-9-]+$/.test(key)) {
      return setError('La clé ne peut contenir que des minuscules, des chiffres et des tirets (ex. "emballages").');
    }

    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        ...draft,
        key,
        label: draft.label.trim(),
        singular: draft.singular.trim(),
        description: draft.description.trim(),
        defaultUnit: draft.defaultUnit.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? `Modifier l'inventaire — ${type!.label}` : "Nouvel inventaire"}
      subtitle={editing ? type!.key : undefined}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer l'inventaire"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label="Nom (onglet)">
            <input
              className="input"
              value={draft.label}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Ex. Emballages"
              autoFocus
            />
          </Field>
          <Field label="Au singulier" hint="Utilisé dans les phrases de l'écran : « Aucun emballage enregistré »">
            <input
              className="input"
              value={draft.singular}
              onChange={(e) => set("singular", e.target.value)}
              placeholder="Ex. emballage"
            />
          </Field>
        </div>

        <div className="form-row">
          <Field label="Unité par défaut" hint="Proposée à chaque nouvel article de cet inventaire">
            <UnitSelect value={draft.defaultUnit} onChange={(unit) => set("defaultUnit", unit)} ariaLabel="Unité par défaut" />
          </Field>
          <Field
            label="Clé technique"
            hint={editing ? "Définitive — tout ce que contient cet inventaire y renvoie." : "Générée à partir du nom. Définitive une fois créée."}
          >
            <input
              className="input"
              value={draft.key}
              disabled={editing}
              onChange={(e) => {
                setKeyTouched(true);
                set("key", e.target.value);
              }}
              placeholder="emballages"
            />
          </Field>
        </div>

        <Field label="Description" hint="Une phrase expliquant ce que contient cet inventaire — affichée sous l'onglet">
          <textarea
            className="input"
            rows={2}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Ex. Cartons et emballages de conditionnement. Pas de péremption, pas de lots."
          />
        </Field>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            Ce que cet inventaire suit
          </p>
          <div className="inventory-option-grid">
            {OPTIONS.map((option) => (
              <label key={option.field} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={draft[option.field]}
                  onChange={(e) => set(option.field, e.target.checked)}
                />
                <span>
                  {option.label}
                  <span className="checkbox-hint">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Banner tone="info">
          Le coût unitaire et la valeur du stock sont suivis pour tous les inventaires — il n'y a pas d'option à activer pour cela.
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
