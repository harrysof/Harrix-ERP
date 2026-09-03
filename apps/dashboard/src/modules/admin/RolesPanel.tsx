import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { fetchPermissionGroups, updateRole, type ApiRole, type PermissionGroup } from "../../lib/authApi";
import { useI18n } from "../../state/LanguageContext";

/**
 * Shows what each role can do, and lets the gérant change it.
 *
 * Roles are rows in the database, not names written into the code, so a
 * future factory can invent "chef d'équipe" without touching this app (build
 * plan Phase 2). The Gérant role is protected: its permissions can't be
 * edited, because it's the way back in when everything else is misconfigured.
 */
export function RolesPanel({ roles, onChanged }: { roles: ApiRole[]; onChanged: () => void }) {
  const { t, tn } = useI18n();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissionGroups().then(setGroups).catch(() => setGroups([]));
  }, []);

  function startEdit(role: ApiRole) {
    setEditingId(role.id);
    setDraft([...role.permissions]);
    setError(null);
  }

  async function save(role: ApiRole) {
    setSaving(true);
    setError(null);
    try {
      await updateRole(role.id, { permissions: draft });
      setEditingId(null);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <Banner tone="info">{t("adm.rolesIntro")}</Banner>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {roles.map((role) => {
        const isEditing = editingId === role.id;
        return (
          <section key={role.id} className="role-card">
            <div className="role-card-header">
              <div>
                <h3 className="role-card-title">
                  {role.label}
                  {role.isProtected ? <Pill tone="neutral">{t("adm.protected")}</Pill> : null}
                </h3>
                <p className="role-card-desc">{role.description}</p>
                <p className="role-card-meta">
                  {role.userCount === 0 ? t("adm.nobodyHasRole") : tn("adm.userCount", role.userCount)}
                </p>
              </div>
              <div className="row-actions">
                {role.isProtected ? (
                  <span className="field-hint">{t("adm.fullAccessLocked")}</span>
                ) : isEditing ? (
                  <>
                    <Button onClick={() => setEditingId(null)}>{t("action.cancel")}</Button>
                    <Button variant="primary" onClick={() => save(role)} disabled={saving}>
                      {saving ? "…" : t("action.save")}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => startEdit(role)}>
                    {t("adm.editPermissions")}
                  </Button>
                )}
              </div>
            </div>

            <div className="permission-grid">
              {groups.map((group) => (
                <div key={group.label} className="permission-group">
                  <p className="permission-group-label">{group.label}</p>
                  {group.permissions.map((permission) => {
                    const granted = isEditing ? draft.includes(permission.key) : role.permissions.includes(permission.key);
                    return (
                      <label key={permission.key} className={`permission-row ${granted ? "permission-row-on" : ""}`}>
                        <input
                          type="checkbox"
                          checked={granted}
                          disabled={!isEditing || role.isProtected}
                          onChange={(e) =>
                            setDraft((prev) =>
                              e.target.checked ? [...prev, permission.key] : prev.filter((p) => p !== permission.key),
                            )
                          }
                        />
                        <span>{permission.label}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
