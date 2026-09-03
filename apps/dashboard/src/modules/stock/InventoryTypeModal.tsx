import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import type { InventoryTypeConfig } from "../../lib/types";
import { UnitSelect } from "../../components/ui/UnitSelect";
import { isValidUnit } from "../../lib/units";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";

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
const OPTIONS: Array<{ field: ToggleField; label: TranslationKey; hint: TranslationKey }> = [
  { field: "hasBatches", label: "inv.opt.batches", hint: "inv.opt.batchesHint" },
  { field: "hasExpiry", label: "inv.opt.expiry", hint: "inv.opt.expiryHint" },
  { field: "isProductionInput", label: "inv.opt.productionInput", hint: "inv.opt.productionInputHint" },
  { field: "hasColor", label: "inv.opt.color", hint: "inv.opt.colorHint" },
  { field: "hasSize", label: "inv.opt.size", hint: "inv.opt.sizeHint" },
  { field: "hasDescription", label: "inv.opt.description", hint: "inv.opt.descriptionHint" },
  { field: "hasMachineInfo", label: "inv.opt.machineInfo", hint: "inv.opt.machineInfoHint" },
  { field: "hasGender", label: "inv.opt.gender", hint: "inv.opt.genderHint" },
  { field: "hasPrice", label: "inv.opt.price", hint: "inv.opt.priceHint" },
  { field: "hasQuality", label: "inv.opt.quality", hint: "inv.opt.qualityHint" },
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
  const { t } = useI18n();
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
    if (!draft.label.trim()) return setError(t("inv.err.name"));
    if (!draft.singular.trim()) return setError(t("inv.singularRequired"));
    if (!isValidUnit(draft.defaultUnit)) {
      return setError(t("inv.err.defaultUnit"));
    }
    const key = draft.key.trim() || toKey(draft.label);
    if (!editing && !/^[a-z0-9-]+$/.test(key)) {
      return setError(t("inv.err.key"));
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
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? t("inv.editTitle", { label: type!.label }) : t("inv.newTitle")}
      subtitle={editing ? type!.key : undefined}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t("action.saving") : editing ? t("action.save") : t("inv.create")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row">
          <Field label={t("inv.tabName")}>
            <input
              className="input"
              value={draft.label}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder={t("inv.ph.tabName")}
              autoFocus
            />
          </Field>
          <Field label={t("inv.singular")} hint={t("inv.singularHint")}>
            <input
              className="input"
              value={draft.singular}
              onChange={(e) => set("singular", e.target.value)}
              placeholder={t("inv.ph.singular")}
            />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t("inv.defaultUnit")} hint={t("inv.defaultUnitHint")}>
            <UnitSelect value={draft.defaultUnit} onChange={(unit) => set("defaultUnit", unit)} ariaLabel={t("inv.defaultUnit")} />
          </Field>
          <Field
            label={t("inv.key")}
            hint={t(editing ? "inv.deleteWarning" : "inv.keyHint")}
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

        <Field label={t("inv.description")} hint={t("inv.descriptionHint")}>
          <textarea
            className="input"
            rows={2}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={t("inv.ph.description")}
          />
        </Field>

        <div>
          <p className="field-label" style={{ marginBottom: 8 }}>
            {t("inv.tracks")}
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
                  {t(option.label)}
                  <span className="checkbox-hint">{t(option.hint)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Banner tone="info">
          {t("inv.costAlwaysTracked")}
        </Banner>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
