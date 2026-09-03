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
import { Rich } from "../../components/ui/Rich";
import { ImagePicker } from "../../components/ui/ImagePicker";
import { inventoryTypeLabel, inventoryTypeSingular } from "../../lib/inventoryTypeI18n";
import { useI18n } from "../../state/LanguageContext";

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
  const { t, lang } = useI18n();
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
      setError(t("item.err.nameReference"));
      return;
    }
    if (!isValidUnit(unit)) {
      setError(t("item.unitInvalid"));
      return;
    }
    const thresholdValue = Number(threshold);
    if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
      setError(t("item.err.threshold"));
      return;
    }
    const priceValue = price === "" ? null : Number(price);
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) {
      setError(t("item.err.price"));
      return;
    }
    const unitCostValue = unitCost === "" ? null : Number(unitCost);
    if (unitCostValue !== null && (!Number.isFinite(unitCostValue) || unitCostValue < 0)) {
      setError(t("item.err.unitCost"));
      return;
    }
    const quantityValue = initialQuantity === "" ? 0 : Number(initialQuantity);
    if (initialQuantity !== "" && (!Number.isFinite(quantityValue) || quantityValue < 0)) {
      setError(t("item.err.initialQuantity"));
      return;
    }
    if (quantityValue > 0) {
      if (inventoryType.hasBatches && !initialBatch.trim()) {
        setError(t("item.initialLotHint"));
        return;
      }
      if (inventoryType.hasExpiry && !initialExpiry) {
        setError(t("item.initialExpiryHint"));
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
      setError(e instanceof Error ? e.message : t("error.generic"));
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
      ? t("item.unitCostPreview", {
          quantity: formatQuantity(item.quantity, item.unit),
          value: formatCurrency(item.quantity * unitCostNumber),
        })
      : null;

  return (
    <Modal
      title={
        item
          ? t("item.editTitle", { name: item.name })
          : t("item.newTitle", { inventory: inventoryTypeLabel(inventoryType, lang) })
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("action.saving") : item ? t("action.save") : t("item.addTitle")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label={t("field.name")}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("item.namePlaceholder", { singular: inventoryTypeSingular(inventoryType, lang) })}
            autoFocus
          />
        </Field>
        <Field label={t("field.reference")}>
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("item.ph.reference")} />
        </Field>
        <div className="form-row">
          <Field label={t("field.unit")} hint={t("item.unitHint")}>
            <UnitSelect value={unit} onChange={setUnit} />
          </Field>
          <Field label={t("item.thresholdLabel")} hint={t("item.thresholdHint")}>
            <input className="input" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
        </div>
        <Field
          label={t("item.unitCostLabel", { unit: unit.trim() || inventoryType.defaultUnit })}
          hint={t("item.unitCostHint")}
        >
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder={t("item.ph.unitCost")}
          />
          {unitCostPreview ? <span className="field-hint">{unitCostPreview}</span> : null}
        </Field>
        {(inventoryType.hasColor || inventoryType.hasSize) && (
          <div className="form-row">
            {inventoryType.hasColor && (
              <Field label={t("stock.col.color")}>
                <input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder={t("item.ph.color")} />
              </Field>
            )}
            {inventoryType.hasSize && (
              <Field label={t("stock.col.size")}>
                <input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder={t("item.ph.size")} />
              </Field>
            )}
          </div>
        )}
        {(inventoryType.hasGender || inventoryType.hasPrice) && (
          <div className="form-row">
            {inventoryType.hasGender && (
              <Field label={t("stock.col.gender")}>
                <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">{t("receive.unspecified")}</option>
                  <option value="M">{t("item.genderM")}</option>
                  <option value="F">{t("item.genderF")}</option>
                </select>
              </Field>
            )}
            {inventoryType.hasPrice && (
              <Field label={t("item.salePriceLabel")} hint={t("item.salePriceHint")}>
                <input className="input" type="number" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("item.ph.price")} />
              </Field>
            )}
          </div>
        )}
        {inventoryType.hasDescription && (
          <Field label={t("field.description")} hint={t("item.descriptionHint")}>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        )}
        {inventoryType.hasMachineInfo && (
          <>
            <p className="detail-type" style={{ margin: 0 }}>
              {t("item.machineSectionShort")}
            </p>
            <div className="form-row">
              <Field label={t("field.machine")}>
                <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder={t("item.ph.machine")} />
              </Field>
              <Field label={t("stock.col.compatibility")}>
                <input className="input" value={compatibility} onChange={(e) => setCompatibility(e.target.value)} placeholder={t("item.ph.compatibility")} />
              </Field>
            </div>
            <div className="form-row">
              <Field label={t("stock.col.manufacturer")}>
                <input className="input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder={t("item.ph.manufacturer")} />
              </Field>
              <Field label={t("stock.col.location")}>
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("item.ph.location")} />
              </Field>
            </div>
            <div className="form-row">
              <Field label={t("stock.col.criticality")} hint={t("item.criticalityHint")}>
                <select className="input" value={criticality} onChange={(e) => setCriticality(e.target.value)}>
                  <option value="">{t("item.unspecifiedF")}</option>
                  <option value="Haute">{t("criticality.high")}</option>
                  <option value="Moyenne">{t("criticality.medium")}</option>
                  <option value="Basse">{t("criticality.low")}</option>
                </select>
              </Field>
            </div>
          </>
        )}
        {!item ? (
          <>
            <p className="detail-type" style={{ margin: 0 }}>
              {t("item.existingStock")}
            </p>
            <div className="form-row">
              <Field
                label={t("item.initialQuantityLabel", { unit: unit.trim() || inventoryType.defaultUnit })}
                hint={t("item.initialQuantityHint")}
              >
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  placeholder={t("item.ph.threshold")}
                />
              </Field>
              <Field label={t("field.date")} hint={t("item.initialDateHint")}>
                <input className="input" type="date" value={initialDate} onChange={(e) => setInitialDate(e.target.value)} />
              </Field>
            </div>

            {Number(initialQuantity) > 0 && (inventoryType.hasBatches || inventoryType.hasExpiry) ? (
              <div className="form-row">
                {inventoryType.hasBatches ? (
                  <Field label={t("field.batchNumber")}>
                    <input className="input" value={initialBatch} onChange={(e) => setInitialBatch(e.target.value)} placeholder={t("item.ph.lot")} />
                  </Field>
                ) : null}
                {inventoryType.hasExpiry ? (
                  <Field label={t("field.expiryDate")}>
                    <input className="input" type="date" value={initialExpiry} onChange={(e) => setInitialExpiry(e.target.value)} />
                  </Field>
                ) : null}
              </div>
            ) : null}

            {initialValue !== null ? (
              <Banner tone="info">
                <Rich
                  text={t("item.initialStockNote", {
                    quantity: formatQuantity(Number(initialQuantity), unit.trim() || inventoryType.defaultUnit),
                    value: formatCurrency(initialValue),
                  })}
                  parts={{ reception: <strong>{t("item.reception")}</strong> }}
                />
              </Banner>
            ) : null}
          </>
        ) : null}

        <Field label={t("item.photoLabel")} hint={t("item.photoHint")}>
          <ImagePicker value={photoUrl || null} onChange={(value) => setPhotoUrl(value ?? "")} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
