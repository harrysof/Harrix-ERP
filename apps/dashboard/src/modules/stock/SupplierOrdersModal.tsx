import { useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import { formatDate, formatQuantity } from "../../lib/format";
import { ApiError } from "../../lib/api";
import type { ApiSupplierOrder, ReceiveOrderInput, SupplierOrderInput } from "../../lib/supplierOrdersApi";
import { createSupplierOrder, fetchSupplierOrders, receiveSupplierOrder } from "../../lib/supplierOrdersApi";
import type { Supplier } from "../../lib/suppliersApi";
import type { ApiItem } from "../../lib/stockApi";
import { SupplierOrderFormModal } from "./SupplierOrderFormModal";
import { ReceiveSupplierOrderModal } from "./ReceiveSupplierOrderModal";

interface SupplierOrdersModalProps {
  suppliers: Supplier[];
  items: ApiItem[];
  onClose: () => void;
  onStockChanged: () => void;
}

type View = { kind: "list" } | { kind: "create" } | { kind: "receive"; order: ApiSupplierOrder };

export function SupplierOrdersModal({ suppliers, items, onClose, onStockChanged }: SupplierOrdersModalProps) {
  const [orders, setOrders] = useState<ApiSupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });

  const load = useCallback(() => {
    setError(null);
    return fetchSupplierOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les commandes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(input: SupplierOrderInput) {
    await createSupplierOrder(input);
    await load();
    setView({ kind: "list" });
  }

  async function handleReceive(order: ApiSupplierOrder, input: ReceiveOrderInput) {
    await receiveSupplierOrder(order.id, input);
    onStockChanged();
    await load();
    setView({ kind: "list" });
  }

  if (view.kind === "create") {
    return <SupplierOrderFormModal suppliers={suppliers} items={items} onClose={() => setView({ kind: "list" })} onSubmit={handleCreate} />;
  }

  if (view.kind === "receive") {
    return <ReceiveSupplierOrderModal order={view.order} onClose={() => setView({ kind: "list" })} onSubmit={(input) => handleReceive(view.order, input)} />;
  }

  const openCount = orders.filter((o) => o.status === "open").length;

  return (
    <Modal
      title="Commandes fournisseurs"
      subtitle={`${openCount} commande${openCount > 1 ? "s" : ""} en cours`}
      width={760}
      onClose={onClose}
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      {error ? <p className="form-error">{error}</p> : null}

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <p className="field-hint" style={{ margin: 0 }}>
          Réceptionner une commande fait entrer le stock en inventaire (mouvements IN).
        </p>
        <Button variant="primary" onClick={() => setView({ kind: "create" })} disabled={suppliers.length === 0}>
          + Nouvelle commande
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <p className="form-error">Aucun fournisseur enregistré — ajoutez-en un dans l'onglet Fournisseurs.</p>
      ) : null}

      {loading ? (
        <p className="loading-text">Chargement des commandes…</p>
      ) : orders.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>
          Aucune commande fournisseur pour le moment.
        </p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-head">
                <div>
                  <strong>{order.supplier.name}</strong>
                  <span className="field-hint"> · commande du {formatDate(order.orderDate)}</span>
                  {order.notes ? <p className="order-notes">{order.notes}</p> : null}
                </div>
                <Pill tone={order.status === "open" ? "warn" : "ok"}>{order.status === "open" ? "En cours" : "Reçue"}</Pill>
              </div>

              <div className="table-scroll">
                <table className="stock-table order-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Référence</th>
                      <th>Quantité</th>
                      {order.lines.some((l) => l.batchNumber) ? <th>Lot</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.item.name}</td>
                        <td className="tabular">{line.item.reference}</td>
                        <td className="tabular">{formatQuantity(line.quantityOrdered, line.item.unit)}</td>
                        {order.lines.some((l) => l.batchNumber) ? <td className="tabular">{line.batchNumber ?? "—"}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-card-foot">
                {order.status === "open" ? (
                  <Button variant="primary" onClick={() => setView({ kind: "receive", order })}>
                    Réceptionner la livraison
                  </Button>
                ) : (
                  <span className="field-hint">Réceptionnée le {formatDate(order.receivedDate ?? order.orderDate)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}