import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { resetUserPassword, type ApiUser } from "../../lib/authApi";
import { useI18n } from "../../state/LanguageContext";

const MIN_PASSWORD_LENGTH = 8;

/** The gérant setting a new password for someone who forgot theirs. */
export function ResetPasswordModal({ user, onClose }: { user: ApiUser; onClose: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(t("adm.err.password", { count: MIN_PASSWORD_LENGTH }));
    }
    setSaving(true);
    try {
      await resetUserPassword(user.id, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("adm.resetFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={t("adm.resetModalTitle", { name: user.fullName })}
      onClose={onClose}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            {t("action.close")}
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>{t("action.cancel")}</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? t("action.saving") : t("adm.reset")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <Banner tone="info">
          {t("adm.newPasswordIs", { name: user.fullName })}{" "}
          <strong>{password}</strong>
          <br />
          {t("adm.tellThemDirectly")}
        </Banner>
      ) : (
        <div className="form-stack">
          <Field label={t("adm.newPassword")} hint={t("adm.newPasswordHint", { count: MIN_PASSWORD_LENGTH })}>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </Field>
          <Banner tone="warn">{t("adm.resetNote")}</Banner>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
