import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { formatDate, formatQuantity } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";
import type { ApiSupplierOrder, ReceiveOrderInput } from "../../lib/supplierOrdersApi";

interface ReceiveSupplierOrderModalProps {
  order: ApiSupplierOrder;
  onClose: () => void;
  onSubmit: (input: ReceiveOrderInput) => Promise<void>;
}

export function ReceiveSupplierOrderModal({ order, onClose, onSubmit }: ReceiveSupplierOrderModalProps) {
  const { t } = useI18n();
  const batchLines = order.lines.filter((l) => l.item.inventoryType.hasBatches);
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    for (const line of batchLines) {
      if (!batchNumbers[line.id]?.trim()) {
        setError(t("so.err.lotFor", { item: line.item.name }));
        return;
      }
      if (line.item.inventoryType.hasExpiry && !expiryDates[line.id]) {
        setError(t("so.err.expiryFor", { item: line.item.name }));
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        lines: batchLines.map((line) => ({
          lineId: line.id,
          batchNumber: batchNumbers[line.id]?.trim(),
          expiryDate: expiryDates[line.id] || undefined,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={t("so.receiveTitle", { supplier: order.supplier.name })}
      subtitle={t("so.orderOf", { date: formatDate(order.orderDate) })}
      width={640}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("so.receiving") : t("so.receive")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <p className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          {t("so.receiveExplainsFull")}
        </p>

        <div className="table-scroll">
          <table className="stock-table order-table">
            <thead>
              <tr>
                <th>{t("field.item")}</th>
                <th>{t("field.reference")}</th>
                <th>{t("field.quantity")}</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.item.name}</td>
                  <td className="tabular">{line.item.reference}</td>
                  <td className="tabular">{formatQuantity(line.quantityOrdered, line.item.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {batchLines.length > 0 ? (
          <div className="order-batches">
            <p className="order-lines-title">{t("so.lotSection")}</p>
            {batchLines.map((line) => (
              <div key={line.id} className="order-batch-block">
                <p className="order-batch-block-name">
                  {line.item.name} <span className="field-hint">({line.item.reference})</span>
                </p>
                <div className="form-row">
                  <Field label={t("field.batchNumber")}>
                    <input
                      className="input"
                      value={batchNumbers[line.id] ?? ""}
                      onChange={(e) => setBatchNumbers((current) => ({ ...current, [line.id]: e.target.value }))}
                      placeholder={t("so.ph.lot")}
                    />
                  </Field>
                  {line.item.inventoryType.hasExpiry ? (
                    <Field label={t("field.expiryDate")}>
                      <input
                        className="input"
                        type="date"
                        value={expiryDates[line.id] ?? ""}
                        onChange={(e) => setExpiryDates((current) => ({ ...current, [line.id]: e.target.value }))}
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}