import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { createUser, updateUser, type ApiRole, type ApiUser } from "../../lib/authApi";

const MIN_PASSWORD_LENGTH = 8;

interface UserModalProps {
  user: ApiUser | null;
  roles: ApiRole[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/** Doubles as the create and edit form, like AddItemModal does for stock. */
export function UserModal({ user, roles, isSelf, onClose, onSaved }: UserModalProps) {
  const editing = user !== null;
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [login, setLogin] = useState(user?.login ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(user?.role.id ?? roles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (!fullName.trim()) return setError("Le nom complet est obligatoire.");
    if (!login.trim()) return setError("L'identifiant est obligatoire.");
    if (!roleId) return setError("Choisissez un rôle.");
    if (!editing && password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
    }

    setSaving(true);
    try {
      if (editing) {
        await updateUser(user.id, {
          fullName: fullName.trim(),
          login: login.trim(),
          // Sending your own roleId is refused by the backend, so don't send it.
          ...(isSelf ? {} : { roleId }),
        });
      } else {
        await createUser({ fullName: fullName.trim(), login: login.trim(), password, roleId });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? `Modifier ${user.fullName}` : "Nouvel utilisateur"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom complet">
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex. Karim Benali" />
        </Field>

        <Field label="Identifiant" hint="Ce qu'il tape pour se connecter. Lettres, chiffres, point, tiret.">
          <input
            className="input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ex. k.benali"
          />
        </Field>

        {editing ? null : (
          <Field label="Mot de passe" hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères. Communiquez-le à la personne, elle pourra le changer.`}>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
        )}

        <Field label="Rôle" hint={isSelf ? undefined : "Détermine ce que cette personne peut voir et faire."}>
          <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={isSelf}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </Field>

        {isSelf ? (
          <Banner tone="info">
            Vous ne pouvez pas changer votre propre rôle — cela pourrait vous retirer l'accès à cette page. Demandez à un autre gérant.
          </Banner>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
