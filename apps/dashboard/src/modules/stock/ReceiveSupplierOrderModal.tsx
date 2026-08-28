import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { formatDate, formatQuantity } from "../../lib/format";
import type { ApiSupplierOrder, ReceiveOrderInput } from "../../lib/supplierOrdersApi";

interface ReceiveSupplierOrderModalProps {
  order: ApiSupplierOrder;
  onClose: () => void;
  onSubmit: (input: ReceiveOrderInput) => Promise<void>;
}

export function ReceiveSupplierOrderModal({ order, onClose, onSubmit }: ReceiveSupplierOrderModalProps) {
  const batchLines = order.lines.filter((l) => l.item.inventoryType.hasBatches);
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    for (const line of batchLines) {
      if (!batchNumbers[line.id]?.trim()) {
        setError(`Le numéro de lot est obligatoire pour "${line.item.name}".`);
        return;
      }
      if (line.item.inventoryType.hasExpiry && !expiryDates[line.id]) {
        setError(`La date de péremption est obligatoire pour "${line.item.name}".`);
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
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Réceptionner la commande — ${order.supplier.name}`}
      subtitle={`Commande du ${formatDate(order.orderDate)}`}
      width={640}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Réception…" : "Réceptionner la livraison"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <p className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Le stock entre en inventaire (mouvements IN) et la commande passe au statut « Reçue ». La réception est totale.
        </p>

        <div className="table-scroll">
          <table className="stock-table order-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Référence</th>
                <th>Quantité</th>
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
            <p className="order-lines-title">Infos lots (obligatoires pour les produits suivis par lot)</p>
            {batchLines.map((line) => (
              <div key={line.id} className="order-batch-block">
                <p className="order-batch-block-name">
                  {line.item.name} <span className="field-hint">({line.item.reference})</span>
                </p>
                <div className="form-row">
                  <Field label="Numéro de lot">
                    <input
                      className="input"
                      value={batchNumbers[line.id] ?? ""}
                      onChange={(e) => setBatchNumbers((current) => ({ ...current, [line.id]: e.target.value }))}
                      placeholder="Ex. L-2420"
                    />
                  </Field>
                  {line.item.inventoryType.hasExpiry ? (
                    <Field label="Date de péremption">
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