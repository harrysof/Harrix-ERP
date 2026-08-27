import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLocalCollection } from "../../lib/useLocalCollection";
import { newId } from "../../lib/id";
import { formatDate } from "../../lib/format";
import { CustomerModal } from "./CustomerModal";
import type { Customer } from "./types";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; customer: Customer };

export function CustomersPage({ orderCountByCustomer }: { orderCountByCustomer: Map<string, number> }) {
  const { items: customers, add, update } = useLocalCollection<Customer>("harrix.customers.v1");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers
      .filter((c) => !query || c.fullName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
  }, [customers, search]);

  return (
    <div className="page-stack">
      <div className="toolbar">
        <input className="input toolbar-search" placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
          + Nouveau client
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={search ? "Aucun client ne correspond à la recherche" : "Aucun client enregistré"}
          action={
            !search ? (
              <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
                + Nouveau client
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Client depuis</th>
                <th>Commandes</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td>{c.fullName}</td>
                  <td>{c.email || "—"}</td>
                  <td className="tabular">{c.phone || "—"}</td>
                  <td className="tabular">{formatDate(c.createdAt)}</td>
                  <td className="tabular">{orderCountByCustomer.get(c.id) ?? 0}</td>
                  <td>
                    <Button variant="secondary" onClick={() => setModal({ kind: "edit", customer: c })}>
                      Modifier
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.kind === "add" && (
        <CustomerModal
          customer={null}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            add({ id: newId("cust"), ...input, createdAt: new Date().toISOString() });
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "edit" && (
        <CustomerModal
          customer={modal.customer}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={(input) => {
            update(modal.customer.id, input);
            setModal({ kind: "none" });
          }}
        />
      )}
    </div>
  );
}
