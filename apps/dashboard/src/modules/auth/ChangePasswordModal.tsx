import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { changeOwnPassword } from "../../lib/authApi";
import { useI18n } from "../../state/LanguageContext";

const MIN_PASSWORD_LENGTH = 8;

/** Anyone changing their own password. Requires the current one. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError(null);
    if (!currentPassword) return setError(t("password.missingCurrent"));
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setError(t("password.tooShort", { count: MIN_PASSWORD_LENGTH }));
    }
    if (newPassword !== confirmPassword) return setError(t("password.mismatch"));

    setSaving(true);
    try {
      await changeOwnPassword({ currentPassword, newPassword });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("password.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={t("password.title")}
      onClose={onClose}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            {t("password.close")}
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>{t("password.cancel")}</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? t("password.saving") : t("password.save")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <Banner tone="info">{t("password.done")}</Banner>
      ) : (
        <div className="form-stack">
          <Field label={t("password.current")}>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <Field label={t("password.new")} hint={t("password.hint", { count: MIN_PASSWORD_LENGTH })}>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t("password.confirm")}>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
