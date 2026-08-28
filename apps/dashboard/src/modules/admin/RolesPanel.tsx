import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { fetchPermissionGroups, updateRole, type ApiRole, type PermissionGroup } from "../../lib/authApi";

/**
 * Shows what each role can do, and lets the gérant change it.
 *
 * Roles are rows in the database, not names written into the code, so a
 * future factory can invent "chef d'équipe" without touching this app (build
 * plan Phase 2). The Gérant role is protected: its permissions can't be
 * edited, because it's the way back in when everything else is misconfigured.
 */
export function RolesPanel({ roles, onChanged }: { roles: ApiRole[]; onChanged: () => void }) {
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
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <Banner tone="info">
        Un rôle décide de ce qu'une personne peut voir et faire. Ces règles sont appliquées par le serveur : masquer un onglet empêche une
        erreur, seul le serveur empêche quelqu'un de curieux.
      </Banner>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {roles.map((role) => {
        const isEditing = editingId === role.id;
        return (
          <section key={role.id} className="role-card">
            <div className="role-card-header">
              <div>
                <h3 className="role-card-title">
                  {role.label}
                  {role.isProtected ? <Pill tone="neutral">protégé</Pill> : null}
                </h3>
                <p className="role-card-desc">{role.description}</p>
                <p className="role-card-meta">
                  {role.userCount === 0
                    ? "Personne n'a ce rôle"
                    : role.userCount === 1
                      ? "1 utilisateur"
                      : `${role.userCount} utilisateurs`}
                </p>
              </div>
              <div className="row-actions">
                {role.isProtected ? (
                  <span className="field-hint">Accès complet, non modifiable</span>
                ) : isEditing ? (
                  <>
                    <Button onClick={() => setEditingId(null)}>Annuler</Button>
                    <Button variant="primary" onClick={() => save(role)} disabled={saving}>
                      {saving ? "…" : "Enregistrer"}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => startEdit(role)}>
                    Modifier les permissions
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
