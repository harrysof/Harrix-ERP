import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import type { InventoryTypeConfig } from "../../lib/types";
import type { ApiBatch } from "../../lib/stockApi";
import { fetchBatches } from "../../lib/stockApi";
import { formatDate, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import { ApiError } from "../../lib/api";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";

/**
 * The reason written to the movement ledger stays the French word, whatever
 * the operator's language: it is stored on every past movement and read back
 * by the item fiche, the dashboard and the audit log. Only its label here
 * follows the interface language.
 */
const REASONS: Array<{ value: string; key: TranslationKey }> = [
  { value: "Vente", key: "reason.sale" },
  { value: "Production", key: "reason.production" },
  { value: "Maintenance", key: "reason.maintenance" },
  { value: "Casse", key: "reason.breakage" },
  { value: "Périmé", key: "reason.expired" },
  { value: "Ajustement d'inventaire", key: "reason.adjustment" },
  { value: "Autre", key: "reason.other" },
];

interface LogUsageModalProps {
  itemId: string;
  itemName: string;
  itemUnit: string;
  itemQuantity: number;
  itemMachine: string;
  inventoryType: InventoryTypeConfig;
  onClose: () => void;
  onSubmit: (input: {
    batchId: string | null;
    quantity: number;
    date: string;
    reason: string;
    machine?: string | null;
    maintenanceRef?: string | null;
    employee?: string | null;
    notes?: string | null;
    quality?: string | null;
  }) => Promise<void> | void;
}

export function LogUsageModal({ itemId, itemName, itemUnit, itemQuantity, itemMachine, inventoryType, onClose, onSubmit }: LogUsageModalProps) {
  const { t } = useI18n();
  const [batches, setBatches] = useState<ApiBatch[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!inventoryType.hasBatches) return;
    fetchBatches(itemId)
      .then((all) => setBatches(all.filter((b) => b.remaining > 0)))
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : t("usage.loadLotsFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, inventoryType.hasBatches]);

  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState(
    inventoryType.hasMachineInfo ? "Maintenance" : inventoryType.hasQuality ? "Vente" : REASONS[0].value,
  );
  const [customReason, setCustomReason] = useState("");
  const [machine, setMachine] = useState(itemMachine);
  const [maintenanceRef, setMaintenanceRef] = useState("");
  const [employee, setEmployee] = useState("");
  const [notes, setNotes] = useState("");
  const [quality, setQuality] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (batches && batches.length > 0 && !batchId) setBatchId(batches[0].id);
  }, [batches, batchId]);

  const selectedBatch = batches?.find((b) => b.id === batchId) ?? null;
  const cap = inventoryType.hasBatches ? (selectedBatch?.remaining ?? 0) : itemQuantity;

  async function handleSubmit() {
    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError(t("receive.err.quantity"));
      return;
    }
    if (inventoryType.hasBatches && !selectedBatch) {
      setError(t("usage.err.chooseLot"));
      return;
    }
    if (quantityValue > cap) {
      setError(
        t(inventoryType.hasBatches ? "usage.err.tooMuchBatch" : "usage.err.tooMuch", {
          quantity: formatQuantity(cap, itemUnit),
        }),
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    const finalReason = reason === "Autre" ? customReason.trim() || "Autre" : reason;
    try {
      await onSubmit({
        batchId: inventoryType.hasBatches ? batchId : null,
        quantity: quantityValue,
        date,
        reason: finalReason,
        machine: inventoryType.hasMachineInfo ? machine.trim() || null : null,
        maintenanceRef: inventoryType.hasMachineInfo ? maintenanceRef.trim() || null : null,
        employee: inventoryType.hasMachineInfo ? employee.trim() || null : null,
        notes: inventoryType.hasMachineInfo ? notes.trim() || null : null,
        quality: inventoryType.hasQuality ? quality || null : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Modal
        title={t("usage.modalTitle", { item: itemName })}
        onClose={onClose}
        footer={<Button onClick={onClose}>{t("action.close")}</Button>}
      >
        <p className="form-error">{loadError}</p>
      </Modal>
    );
  }

  if (inventoryType.hasBatches && batches === null) {
    return (
      <Modal title={t("usage.modalTitle", { item: itemName })} onClose={onClose}>
        <p className="loading-text">{t("usage.loadingLots")}</p>
      </Modal>
    );
  }

  if (inventoryType.hasBatches && batches?.length === 0) {
    return (
      <Modal
        title={t("usage.modalTitle", { item: itemName })}
        onClose={onClose}
        footer={<Button onClick={onClose}>{t("action.close")}</Button>}
      >
        <p className="form-error">{t("usage.noLots")}</p>
      </Modal>
    );
  }

  return (
    <Modal
      title={t("usage.modalTitle", { item: itemName })}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("action.saving") : t("usage.title")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {inventoryType.hasBatches ? (
          <Field label={t("usage.lotToUse")} hint={t("usage.lotHint")}>
            <select className="input" value={batchId ?? ""} onChange={(e) => setBatchId(e.target.value)}>
              {batches!.map((b, i) => (
                <option key={b.id} value={b.id}>
                  {t("usage.batchOption", {
                    batch: b.batchNumber,
                    date: formatDate(b.receivedDate),
                    remaining: formatQuantity(b.remaining, itemUnit),
                  })}
                  {i === 0 ? t("usage.batchPriority") : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="field-hint" style={{ margin: 0 }}>
            {t("usage.available", { quantity: formatQuantity(itemQuantity, itemUnit) })}
          </p>
        )}

        {selectedBatch?.status === "expired" ? <Pill tone="danger">{t("usage.lotExpired")}</Pill> : null}
        {selectedBatch?.status === "warning" ? <Pill tone="warn">{t("usage.lotExpiringSoon")}</Pill> : null}

        <div className="form-row">
          <Field label={t("usage.quantityLabel", { unit: itemUnit })}>
            <input className="input" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
          </Field>
          <Field label={t("field.date")}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label={t("field.reason")}>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.key)}
              </option>
            ))}
          </select>
        </Field>
        {reason === "Autre" ? (
          <Field label={t("usage.specify")}>
            <input className="input" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
          </Field>
        ) : null}

        {inventoryType.hasQuality ? (
          <Field label={t("quality.classLabel")} hint={t("usage.qualityHint")}>
            <select className="input" value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">{t("receive.unclassified")}</option>
              <option value="1er">{t("quality.first")}</option>
              <option value="2ème">{t("quality.second")}</option>
              <option value="rebut">{t("quality.reject")}</option>
            </select>
          </Field>
        ) : null}

        {inventoryType.hasMachineInfo ? (
          <>
            <p className="detail-type" style={{ margin: 0 }}>
              {t("usage.maintenanceSection")}
            </p>
            <Field label={t("field.machine")}>
              <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder={t("usage.machineConcerned")} />
            </Field>
            <div className="form-row">
              <Field label={t("usage.maintenanceRef")} hint={t("usage.ph.maintenanceRef")}>
                <input className="input" value={maintenanceRef} onChange={(e) => setMaintenanceRef(e.target.value)} />
              </Field>
              <Field label={t("usage.operator")}>
                <input className="input" value={employee} onChange={(e) => setEmployee(e.target.value)} />
              </Field>
            </div>
            <Field label={t("field.notes")}>
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("usage.ph.notes")} />
            </Field>
          </>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
