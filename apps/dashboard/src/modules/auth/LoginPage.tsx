import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Banner } from "../../components/ui/Banner";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";

/**
 * The single login screen, shared by every app that will talk to this backend
 * (build plan Phase 2). Deliberately plain: it is the first thing a worker
 * sees at 6am on a shared floor terminal.
 */
export function LoginPage() {
  const { login, sessionEndedMessage, clearSessionEndedMessage } = useAuth();
  const { t } = useI18n();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!loginName.trim() || !password) {
      setError(t("login.missingFields"));
      return;
    }

    setSubmitting(true);
    try {
      clearSessionEndedMessage();
      await login(loginName.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("login.failed"));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img className="login-brand-mark" src="/logo.png" alt="" />
          <div>
            <h1 className="login-title">{t("brand.name")}</h1>
            <p className="login-subtitle">{t("login.subtitle")}</p>
          </div>
        </div>

        {sessionEndedMessage ? <Banner tone="warn">{sessionEndedMessage}</Banner> : null}

        <Field label={t("login.identifier")}>
          <input
            className="input"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            autoComplete="username"
            autoFocus
            autoCapitalize="none"
            spellCheck={false}
            disabled={submitting}
          />
        </Field>

        <Field label={t("login.password")}>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={submitting}
          />
        </Field>

        {error ? <p className="form-error">{error}</p> : null}

        <Button type="submit" variant="primary" disabled={submitting} className="login-submit">
          {submitting ? t("login.submitting") : t("login.submit")}
        </Button>

        <p className="login-help">{t("login.help")}</p>
      </form>
    </div>
  );
}
