import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import { logUsage } from "../../lib/stockApi";
import type { Customer, Order } from "./types";
import { orderSubtotal, orderTotal } from "./types";

export function OrderInvoiceModal({
  order,
  customer,
  onClose,
  onUpdate,
}: {
  order: Order;
  customer: Customer | undefined;
  onClose: () => void;
  onUpdate: (patch: Partial<Order>) => void;
}) {
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);

  async function markShipped() {
    setShipError(null);
    setShipping(true);
    const completed: string[] = [];
    try {
      for (const line of order.lines) {
        await logUsage(line.productItemId, { quantity: line.quantity, date: new Date().toISOString().slice(0, 10), reason: "Vente" });
        completed.push(line.productName);
      }
      onUpdate({ shipmentStatus: "Expédié" });
    } catch (e) {
      setShipError(
        `Échec après avoir décrémenté : ${completed.join(", ") || "aucun article"}. ${e instanceof Error ? e.message : "Erreur inconnue."} — vérifiez le stock dans l'onglet Stock avant de réessayer.`,
      );
    } finally {
      setShipping(false);
    }
  }

  return (
    <Modal title={`Commande ${order.orderNumber}`} onClose={onClose} width={640} footer={<Button onClick={onClose}>Fermer</Button>}>
      <div className="form-stack">
        <div className="form-row">
          <div>
            <p className="field-label">Client</p>
            <p>{order.customerName}</p>
            {customer?.email ? <p className="field-hint">{customer.email}</p> : null}
            {customer?.phone ? <p className="field-hint">{customer.phone}</p> : null}
            {customer?.address ? <p className="field-hint">{customer.address}</p> : null}
          </div>
          <div>
            <p className="field-label">Date</p>
            <p className="tabular">{formatDate(order.date)}</p>
          </div>
        </div>

        <div className="form-row">
          <div>
            <p className="field-label">Statut d'expédition</p>
            <Pill tone={order.shipmentStatus === "Expédié" ? "ok" : order.shipmentStatus === "Annulé" ? "danger" : "warn"}>{order.shipmentStatus}</Pill>
          </div>
          <div>
            <p className="field-label">Statut de paiement</p>
            <Pill tone={order.paymentStatus === "Payé" ? "ok" : order.paymentStatus === "Annulé" ? "danger" : "warn"}>{order.paymentStatus}</Pill>
          </div>
        </div>

        <div className="table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, i) => (
                <tr key={i}>
                  <td>{line.productName}</td>
                  <td className="tabular">{formatQuantity(line.quantity, line.unit)}</td>
                  <td className="tabular">{formatCurrency(line.unitPrice)}</td>
                  <td className="tabular">{formatCurrency(line.quantity * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="reconciliation">
          <div className="reconciliation-figure">
            <span className="label">Sous-total</span>
            <span className="value tabular">{formatCurrency(orderSubtotal(order))}</span>
          </div>
          <div className="reconciliation-figure">
            <span className="label">Livraison</span>
            <span className="value tabular">{formatCurrency(order.shipping)}</span>
          </div>
          <div className="reconciliation-figure">
            <span className="label">Remise</span>
            <span className="value tabular">-{formatCurrency(order.discount)}</span>
          </div>
          <div className="reconciliation-figure">
            <span className="label">Taxe</span>
            <span className="value tabular">{formatCurrency(order.tax)}</span>
          </div>
          <div className="reconciliation-figure gap-zero">
            <span className="label">Total</span>
            <span className="value tabular">{formatCurrency(orderTotal(order))}</span>
          </div>
        </div>

        {shipError ? <Banner tone="danger">{shipError}</Banner> : null}

        <div className="row-actions">
          {order.shipmentStatus !== "Expédié" && (
            <Button variant="primary" onClick={markShipped} disabled={shipping}>
              {shipping ? "Expédition…" : "Marquer comme expédié"}
            </Button>
          )}
          {order.paymentStatus !== "Payé" && (
            <Button variant="secondary" onClick={() => onUpdate({ paymentStatus: "Payé" })}>
              Marquer comme payé
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
