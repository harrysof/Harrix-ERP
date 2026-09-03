import { Languages } from "lucide-react";
import { LANGUAGE_LABEL, LANGUAGE_SHORT } from "../../lib/i18n";
import { useI18n } from "../../state/LanguageContext";

/**
 * Two languages, so one button that names the one you'd switch to — no menu
 * to open on a shared floor terminal.
 */
export function LanguageToggle() {
  const { lang, toggleLanguage, t } = useI18n();
  const next = lang === "fr" ? "ar" : "fr";
  const label = t("language.switchTo", { language: LANGUAGE_LABEL[next] });

  return (
    <button type="button" className="topbar-icon-button language-toggle" onClick={toggleLanguage} aria-label={label} title={label}>
      <Languages size={18} strokeWidth={2} />
      <span className="language-toggle-code">{LANGUAGE_SHORT[next]}</span>
    </button>
  );
}
