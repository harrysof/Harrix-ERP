import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { Pill } from "../../components/ui/Pill";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import {
  fetchRoles,
  fetchUsers,
  setUserActive,
  type ApiRole,
  type ApiUser,
} from "../../lib/authApi";
import { useAuth } from "../../state/AuthContext";
import { UserModal } from "./UserModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { RolesPanel } from "./RolesPanel";

type Tab = "users" | "roles";
type Modal = { kind: "none" } | { kind: "create" } | { kind: "edit"; user: ApiUser } | { kind: "password"; user: ApiUser };

/**
 * The gérant's screen for creating and deactivating users — "workers leave, he
 * needs to cut access himself without calling you" (build plan Phase 2).
 *
 * Reachable only with users:manage. The sidebar hides the tab without it, and
 * the backend refuses every route here regardless.
 */
export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>({ kind: "none" });

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchUsers(true), fetchRoles()])
      .then(([nextUsers, nextRoles]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les utilisateurs."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(user: ApiUser) {
    const verb = user.active ? "Désactiver" : "Réactiver";
    if (!window.confirm(`${verb} le compte de ${user.fullName} ?`)) return;
    setError(null);
    try {
      await setUserActive(user.id, !user.active);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action impossible.");
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <div className="tab-strip">
          <button type="button" className={`tab-strip-item ${tab === "users" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("users")}>
            Utilisateurs
            {users.length > 0 ? <span className="tab-strip-badge">{users.length}</span> : null}
          </button>
          <button type="button" className={`tab-strip-item ${tab === "roles" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("roles")}>
            Rôles & permissions
          </button>
        </div>
        {tab === "users" ? (
          <div className="toolbar-actions">
            <Button variant="primary" onClick={() => setModal({ kind: "create" })}>
              + Nouvel utilisateur
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : tab === "roles" ? (
        <RolesPanel roles={roles} onChanged={load} />
      ) : users.length === 0 ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Identifiant</th>
                <th>Rôle</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr key={user.id} className={user.active ? undefined : "row-muted"}>
                    <td>
                      {user.fullName}
                      {isSelf ? <span className="muted"> (vous)</span> : null}
                    </td>
                    <td className="tabular">{user.login}</td>
                    <td>{user.role.label}</td>
                    <td className="tabular">{user.lastLoginAt ? formatDate(user.lastLoginAt) : <span className="muted">jamais</span>}</td>
                    <td>
                      <Pill tone={user.active ? "ok" : "neutral"}>{user.active ? "Actif" : "Désactivé"}</Pill>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button variant="ghost" onClick={() => setModal({ kind: "edit", user })}>
                          Modifier
                        </Button>
                        <Button variant="ghost" onClick={() => setModal({ kind: "password", user })}>
                          Mot de passe
                        </Button>
                        {/* The backend refuses this for yourself and for the
                            last administrator; hiding it for yourself just
                            avoids offering a button that always fails. */}
                        {isSelf ? null : (
                          <Button variant={user.active ? "danger" : "secondary"} onClick={() => toggleActive(user)}>
                            {user.active ? "Désactiver" : "Réactiver"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal.kind === "create" || modal.kind === "edit" ? (
        <UserModal
          user={modal.kind === "edit" ? modal.user : null}
          roles={roles}
          isSelf={modal.kind === "edit" && modal.user.id === currentUser?.id}
          onClose={() => setModal({ kind: "none" })}
          onSaved={() => {
            setModal({ kind: "none" });
            load();
          }}
        />
      ) : null}

      {modal.kind === "password" ? (
        <ResetPasswordModal user={modal.user} onClose={() => setModal({ kind: "none" })} />
      ) : null}
    </div>
  );
}
