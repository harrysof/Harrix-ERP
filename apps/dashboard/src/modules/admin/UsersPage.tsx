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
import { useI18n } from "../../state/LanguageContext";
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
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>({ kind: "none" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchUsers(true), fetchRoles()])
      .then(([nextUsers, nextRoles]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("adm.loadUsersFailed")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(user: ApiUser) {
    const verb = t(user.active ? "adm.deactivate" : "adm.reactivate");
    if (!window.confirm(t("adm.confirmToggleActive", { verb, name: user.fullName }))) return;
    setError(null);
    try {
      await setUserActive(user.id, !user.active);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.action"));
    }
  }

  return (
    <div className="page-stack">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="toolbar">
        <div className="tab-strip">
          <button type="button" className={`tab-strip-item ${tab === "users" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("users")}>
            {t("adm.tabUsers")}
            {users.length > 0 ? <span className="tab-strip-badge">{users.length}</span> : null}
          </button>
          <button type="button" className={`tab-strip-item ${tab === "roles" ? "tab-strip-item-active" : ""}`} onClick={() => setTab("roles")}>
            {t("adm.tabRoles")}
          </button>
        </div>
        {tab === "users" ? (
          <div className="toolbar-actions">
            <Button variant="primary" onClick={() => setModal({ kind: "create" })}>
              {t("adm.newUser")}
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="loading-text">{t("state.loading")}</p>
      ) : tab === "roles" ? (
        <RolesPanel roles={roles} onChanged={load} />
      ) : users.length === 0 ? (
        <EmptyState title={t("adm.noUsers")} />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>{t("field.name")}</th>
                <th>{t("login.identifier")}</th>
                <th>{t("adm.role")}</th>
                <th>{t("adm.col.lastLogin")}</th>
                <th>{t("field.status")}</th>
                <th>{t("field.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr key={user.id} className={user.active ? undefined : "row-muted"}>
                    <td>
                      {user.fullName}
                      {isSelf ? <span className="muted"> {t("adm.you")}</span> : null}
                    </td>
                    <td className="tabular">{user.login}</td>
                    <td>{user.role.label}</td>
                    <td className="tabular">{user.lastLoginAt ? formatDate(user.lastLoginAt) : <span className="muted">{t("adm.never")}</span>}</td>
                    <td>
                      <Pill tone={user.active ? "ok" : "neutral"}>{t(user.active ? "state.active" : "adm.deactivated")}</Pill>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button variant="ghost" onClick={() => setModal({ kind: "edit", user })}>
                          {t("action.edit")}
                        </Button>
                        <Button variant="ghost" onClick={() => setModal({ kind: "password", user })}>
                          {t("adm.password")}
                        </Button>
                        {/* The backend refuses this for yourself and for the
                            last administrator; hiding it for yourself just
                            avoids offering a button that always fails. */}
                        {isSelf ? null : (
                          <Button variant={user.active ? "danger" : "secondary"} onClick={() => toggleActive(user)}>
                            {t(user.active ? "adm.deactivate" : "adm.reactivate")}
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
