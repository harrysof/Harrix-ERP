import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { changeOwnPassword } from "../../lib/authApi";

const MIN_PASSWORD_LENGTH = 8;

/** Anyone changing their own password. Requires the current one. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError(null);
    if (!currentPassword) return setError("Entrez votre mot de passe actuel.");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setError(`Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
    }
    if (newPassword !== confirmPassword) return setError("Les deux nouveaux mots de passe ne correspondent pas.");

    setSaving(true);
    try {
      await changeOwnPassword({ currentPassword, newPassword });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Changement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Changer mon mot de passe"
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
              {saving ? "Enregistrement…" : "Changer"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <Banner tone="info">Votre mot de passe a été changé. Il sera demandé à votre prochaine connexion.</Banner>
      ) : (
        <div className="form-stack">
          <Field label="Mot de passe actuel">
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <Field label="Nouveau mot de passe" hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
