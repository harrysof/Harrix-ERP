import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../state/ThemeContext";
import { useI18n } from "../../state/LanguageContext";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="topbar-icon-button"
      onClick={toggleTheme}
      aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
      title={isDark ? t("theme.light") : t("theme.dark")}
    >
      {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </button>
  );
}
