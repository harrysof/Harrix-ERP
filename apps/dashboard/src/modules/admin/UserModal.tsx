import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { createUser, updateUser, type ApiRole, type ApiUser } from "../../lib/authApi";
import { useI18n } from "../../state/LanguageContext";

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
  const { t } = useI18n();
  const editing = user !== null;
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [login, setLogin] = useState(user?.login ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(user?.role.id ?? roles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (!fullName.trim()) return setError(t("adm.err.fullName"));
    if (!login.trim()) return setError(t("adm.err.login"));
    if (!roleId) return setError(t("adm.err.role"));
    if (!editing && password.length < MIN_PASSWORD_LENGTH) {
      return setError(t("adm.err.password", { count: MIN_PASSWORD_LENGTH }));
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
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? t("adm.editUserTitle", { name: user.fullName }) : t("adm.newUserTitle")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t("action.saving") : t("action.save")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label={t("field.fullName")}>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("adm.ph.fullName")} />
        </Field>

        <Field label={t("login.identifier")} hint={t("adm.loginHint")}>
          <input
            className="input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("adm.ph.login")}
          />
        </Field>

        {editing ? null : (
          <Field label={t("adm.password")} hint={t("adm.passwordHint", { count: MIN_PASSWORD_LENGTH })}>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
        )}

        <Field label={t("adm.role")} hint={isSelf ? undefined : t("adm.roleHint")}>
          <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={isSelf}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </Field>

        {isSelf ? (
          <Banner tone="info">{t("adm.cannotChangeOwnRole")}</Banner>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
