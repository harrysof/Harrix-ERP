import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DIRECTION,
  LOCALE,
  TRANSLATIONS,
  plural,
  translate,
  type Language,
  type TranslationKey,
} from "../lib/i18n";
import { setFormatLanguage } from "../lib/format";

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
  /**
   * A counted noun. `base` names a family of keys — `base.one`, `.two`,
   * `.few`, `.other` — and the right one is chosen for the active language:
   * French needs two forms, Arabic needs four for the numbers a UI actually
   * shows. `{count}` is filled in for you.
   */
  tn: (base: CountKey, count: number, vars?: Record<string, string | number>) => string;
}

/**
 * The keys that name a plural family: everything before the `.one` / `.two` /
 * `.few` / `.other` suffix. Derived from the catalogue, so `tn("dash.orderCnt")`
 * — a family that does not exist — will not compile.
 */
type BaseOf<K> = K extends `${infer Base}.one` ? Base : never;
type CountKey = BaseOf<TranslationKey>;

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
  const [lang, setLang] = useState<Language>(() => {
    const initial = readStored() ?? "fr";
    // Before the first render, not in an effect: the formatters are called
    // during render by every table and chart, so they have to already be in
    // the right language by the time those run.
    setFormatLanguage(initial);
    return initial;
  });

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", DIRECTION[lang]);
  }, [lang]);

  const setLanguage = useCallback((next: Language) => {
    setFormatLanguage(next);
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
      tn: (base, count, vars) => {
        const form = plural(lang, count, { one: "one", two: "two", few: "few", other: "other" });
        return translate(lang, `${base}.${form}` as TranslationKey, { count, ...vars });
      },
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
