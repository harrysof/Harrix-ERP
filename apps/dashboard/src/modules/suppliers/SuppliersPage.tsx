import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupplier, fetchSuppliers, setSupplierArchived, updateSupplier, type Supplier } from "../../lib/suppliersApi";
import { ApiError } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Banner } from "../../components/ui/Banner";
import { SupplierModal } from "./SupplierModal";
import { SupplierDetailModal } from "./SupplierDetailModal";
import { useAuth } from "../../state/AuthContext";

type ModalState = { kind: "none" } | { kind: "add" } | { kind: "edit"; supplier: Supplier } | { kind: "detail"; supplier: Supplier };

export function SuppliersPage() {
  const { can } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchSuppliers(true)
      .then(setSuppliers)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les fournisseurs."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers
      .filter((s) => showArchived || !s.archived)
      .filter((s) => !query || s.name.toLowerCase().includes(query) || (s.contactName ?? "").toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [suppliers, showArchived, search]);

  async function toggleArchive(supplier: Supplier) {
    await setSupplierArchived(supplier.id, !supplier.archived);
    await load();
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <input
          className="input toolbar-search"
          placeholder="Rechercher un fournisseur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="toolbar-actions">
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Afficher les archivés
          </label>
          <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
            + Nouveau fournisseur
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? "Aucun fournisseur ne correspond à la recherche" : "Aucun fournisseur enregistré"}
          description={!search ? "Ajoutez vos fournisseurs de matières premières et de pièces détachées." : undefined}
          action={
            !search ? (
              <Button variant="primary" onClick={() => setModal({ kind: "add" })}>
                + Nouveau fournisseur
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
                <th>Contact</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    {can("purchasing:read") ? (
                      <button type="button" className="link-button" onClick={() => setModal({ kind: "detail", supplier: s })}>
                        {s.name}
                      </button>
                    ) : (
                      s.name
                    )}
                  </td>
                  <td>{s.contactName ?? "—"}</td>
                  <td className="tabular">{s.phone ?? "—"}</td>
                  <td>
                    <Pill tone={s.archived ? "neutral" : "ok"}>{s.archived ? "Archivé" : "Actif"}</Pill>
                  </td>
                  <td>
                    <div className="row-actions">
                      {can("purchasing:read") ? (
                        <Button variant="ghost" onClick={() => setModal({ kind: "detail", supplier: s })}>
                          Fiche
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={() => setModal({ kind: "edit", supplier: s })}>
                        Modifier
                      </Button>
                      <Button variant="ghost" onClick={() => toggleArchive(s)}>
                        {s.archived ? "Désarchiver" : "Archiver"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.kind === "add" && (
        <SupplierModal
          supplier={null}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await createSupplier(input);
            await load();
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "detail" && (
        <SupplierDetailModal supplier={modal.supplier} onClose={() => setModal({ kind: "none" })} />
      )}

      {modal.kind === "edit" && (
        <SupplierModal
          supplier={modal.supplier}
          onClose={() => setModal({ kind: "none" })}
          onSubmit={async (input) => {
            await updateSupplier(modal.supplier.id, input);
            await load();
            setModal({ kind: "none" });
          }}
        />
      )}
    </div>
  );
}
