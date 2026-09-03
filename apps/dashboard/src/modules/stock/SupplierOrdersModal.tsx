import { useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import { formatDate, formatQuantity } from "../../lib/format";
import { ApiError } from "../../lib/api";
import { useI18n } from "../../state/LanguageContext";
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
  const { t, tn } = useI18n();
  const [orders, setOrders] = useState<ApiSupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    setError(null);
    return fetchSupplierOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("so.loadFailed")))
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
      title={t("so.title")}
      subtitle={tn("so.openCount", openCount)}
      width={760}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t("action.close")}</Button>}
    >
      {error ? <p className="form-error">{error}</p> : null}

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <p className="field-hint" style={{ margin: 0 }}>
          {t("so.receiveExplains")}
        </p>
        <Button variant="primary" onClick={() => setView({ kind: "create" })} disabled={suppliers.length === 0}>
          {t("so.new")}
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <p className="form-error">{t("so.noSupplier")}</p>
      ) : null}

      {loading ? (
        <p className="loading-text">{t("so.loading")}</p>
      ) : orders.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>
          {t("so.none")}
        </p>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-head">
                <div>
                  <strong>{order.supplier.name}</strong>
                  <span className="field-hint"> {t("so.orderedOn", { date: formatDate(order.orderDate) })}</span>
                  {order.notes ? <p className="order-notes">{order.notes}</p> : null}
                </div>
                <Pill tone={order.status === "open" ? "warn" : "ok"}>{t(order.status === "open" ? "so.pending" : "so.received")}</Pill>
              </div>

              <div className="table-scroll">
                <table className="stock-table order-table">
                  <thead>
                    <tr>
                      <th>{t("field.item")}</th>
                      <th>{t("field.reference")}</th>
                      <th>{t("field.quantity")}</th>
                      {order.lines.some((l) => l.batchNumber) ? <th>{t("field.batch")}</th> : null}
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
                    {t("so.receive")}
                  </Button>
                ) : (
                  <span className="field-hint">{t("so.receivedOn", { date: formatDate(order.receivedDate ?? order.orderDate) })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}