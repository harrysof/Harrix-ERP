import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { resetUserPassword, type ApiUser } from "../../lib/authApi";

const MIN_PASSWORD_LENGTH = 8;

/** The gérant setting a new password for someone who forgot theirs. */
export function ResetPasswordModal({ user, onClose }: { user: ApiUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
    }
    setSaving(true);
    try {
      await resetUserPassword(user.id, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Mot de passe — ${user.fullName}`}
      onClose={onClose}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Fermer
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Réinitialiser"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <Banner tone="info">
          Le mot de passe de {user.fullName} est maintenant : <strong>{password}</strong>
          <br />
          Communiquez-le-lui directement. Il ne sera plus affiché.
        </Banner>
      ) : (
        <div className="form-stack">
          <Field label="Nouveau mot de passe" hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </Field>
          <Banner tone="warn">
            Cette action ne demande pas l'ancien mot de passe. Elle est enregistrée dans le journal d'activité.
          </Banner>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
