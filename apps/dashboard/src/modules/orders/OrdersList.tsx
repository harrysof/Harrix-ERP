import { EmptyState } from "../../components/ui/EmptyState";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Order } from "./types";
import { orderTotal } from "./types";

export function OrdersList({ orders, onOpen, onNew }: { orders: Order[]; onOpen: (order: Order) => void; onNew: () => void }) {
  if (orders.length === 0) {
    return <EmptyState title="Aucune commande enregistrée" action={<Button variant="primary" onClick={onNew}>+ Nouvelle commande</Button>} />;
  }

  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="table-scroll">
      <table className="stock-table">
        <thead>
          <tr>
            <th>Commande</th>
            <th>Date</th>
            <th>Client</th>
            <th>Expédition</th>
            <th>Paiement</th>
            <th>Total</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((order) => (
            <tr key={order.id}>
              <td className="tabular">{order.orderNumber}</td>
              <td className="tabular">{formatDate(order.date)}</td>
              <td>{order.customerName}</td>
              <td>
                <Pill tone={order.shipmentStatus === "Expédié" ? "ok" : order.shipmentStatus === "Annulé" ? "danger" : "warn"}>{order.shipmentStatus}</Pill>
              </td>
              <td>
                <Pill tone={order.paymentStatus === "Payé" ? "ok" : order.paymentStatus === "Annulé" ? "danger" : "warn"}>{order.paymentStatus}</Pill>
              </td>
              <td className="tabular">{formatCurrency(orderTotal(order))}</td>
              <td>
                <Button variant="secondary" onClick={() => onOpen(order)}>
                  Voir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
