import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { useLocalCollection } from "../../lib/useLocalCollection";
import { newId } from "../../lib/id";
import { fetchItems, type ApiItem } from "../../lib/stockApi";
import { ApiError } from "../../lib/api";
import { CustomersPage } from "./CustomersPage";
import { OrdersList } from "./OrdersList";
import { OrderModal } from "./OrderModal";
import { OrderInvoiceModal } from "./OrderInvoiceModal";
import type { Customer, Order } from "./types";

type Tab = "orders" | "customers";
type ModalState = { kind: "none" } | { kind: "new" } | { kind: "view"; order: Order };

export function OrdersPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const { items: customers } = useLocalCollection<Customer>("harrix.customers.v1");
  const { items: orders, add: addOrder, update: updateOrder } = useLocalCollection<Order>("harrix.orders.v1");
  const [finishedGoods, setFinishedGoods] = useState<ApiItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const loadFinishedGoods = useCallback(() => {
    fetchItems()
      .then((all) => setFinishedGoods(all.filter((i) => i.inventoryType.key === "finished-goods")))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les produits finis."));
  }, []);

  useEffect(() => {
    loadFinishedGoods();
  }, [loadFinishedGoods]);

  const orderCountByCustomer = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
    return counts;
  }, [orders]);

  return (
    <div className="page-stack">
      <Banner tone="info">
        Les commandes et les clients sont enregistrés dans ce navigateur, pas encore sur le serveur. Expédier une commande décrémente bien le
        vrai stock de produits finis via l'API — voir PROJECT_CONTEXT.md, section "Commandes & clients".
      </Banner>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="tab-strip">
        <button type="button" className={`tab-strip-item ${tab === "orders" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("orders")}>
          Commandes
        </button>
        <button type="button" className={`tab-strip-item ${tab === "customers" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("customers")}>
          Clients
        </button>
      </div>

      {tab === "customers" ? (
        <CustomersPage orderCountByCustomer={orderCountByCustomer} />
      ) : (
        <>
          <div className="toolbar">
            <div />
            <Button variant="primary" onClick={() => setModal({ kind: "new" })}>
              + Nouvelle commande
            </Button>
          </div>
          <OrdersList orders={orders} onOpen={(order) => setModal({ kind: "view", order })} onNew={() => setModal({ kind: "new" })} />
        </>
      )}

      {modal.kind === "new" && (
        <OrderModal
          customers={customers}
          finishedGoodsItems={finishedGoods}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            addOrder({ id: newId("order"), orderNumber: `CMD-${String(orders.length + 1).padStart(4, "0")}`, createdAt: new Date().toISOString(), ...input });
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "view" && (
        <OrderInvoiceModal
          order={modal.order}
          customer={customers.find((c) => c.id === modal.order.customerId)}
          onClose={() => {
            setModal({ kind: "none" });
            loadFinishedGoods();
          }}
          onUpdate={(patch) => {
            updateOrder(modal.order.id, patch);
            setModal({ kind: "view", order: { ...modal.order, ...patch } });
          }}
        />
      )}
    </div>
  );
}
