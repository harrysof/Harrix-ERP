import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DIRECTION,
  LOCALE,
  TRANSLATIONS,
  translate,
  type Language,
  type TranslationKey,
} from "../lib/i18n";

const STORAGE_KEY = "harrix.language.v1";

interface LanguageContextValue {
  lang: Language;
  /** "ltr" for French, "rtl" for Arabic — mirrors <html dir>. */
  dir: "ltr" | "rtl";
  /** Intl locale for the active language ("fr-FR" / "ar-DZ"). */
  locale: string;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  /** Looks up a key in the active language; {name} placeholders take `vars`. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStored(): Language | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v in TRANSLATIONS ? (v as Language) : null;
  } catch {
    return null;
  }
}

/**
 * French is the default: it is what the office already uses, so a fresh
 * browser keeps behaving exactly as before. index.html applies the stored
 * choice to <html lang/dir> before React mounts, so a returning Arabic user
 * never sees the layout flip from left to right after load.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => readStored() ?? "fr");

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", DIRECTION[lang]);
  }, [lang]);

  const setLanguage = useCallback((next: Language) => {
    setLang(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage disabled: the choice still holds for this tab.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: DIRECTION[lang],
      locale: LOCALE[lang],
      setLanguage,
      toggleLanguage: () => setLanguage(lang === "fr" ? "ar" : "fr"),
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
