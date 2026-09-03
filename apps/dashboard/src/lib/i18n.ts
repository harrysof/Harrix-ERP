/**
 * Translation catalogue. French stays the source of truth: `fr` below defines
 * the key set, and `ar` is typed against it, so a missing or stale Arabic
 * string is a compile error rather than a blank label on the floor terminal.
 *
 * Only the app shell (navigation, top bar, sign-in, account) is translated so
 * far — the module pages are still French-only. Add their strings here as each
 * one is converted; nothing else has to change.
 */

export type Language = "fr" | "ar";

export const LANGUAGES: Language[] = ["fr", "ar"];

/** Written direction of each language — drives <html dir> and the RTL styles. */
export const DIRECTION: Record<Language, "ltr" | "rtl"> = { fr: "ltr", ar: "rtl" };

/** The locale used for Intl date/number formatting per language. */
export const LOCALE: Record<Language, string> = { fr: "fr-FR", ar: "ar-DZ" };

/** How each language names itself, for the language switcher. */
export const LANGUAGE_LABEL: Record<Language, string> = { fr: "Français", ar: "العربية" };

/** Two-letter chip shown inside the switcher button. */
export const LANGUAGE_SHORT: Record<Language, string> = { fr: "FR", ar: "ع" };

const fr = {
  "brand.name": "Harrix ERP",
  "brand.tagline": "Système de gestion d'usine",
  "brand.creditPrefix": "Développé et maintenu par",
  "brand.creditNames": "Sofiane & Khalil",

  "nav.group.general": "Général",
  "nav.group.inventory": "Inventaire",
  "nav.group.production": "Production",
  "nav.group.sales": "Ventes",
  "nav.group.purchasing": "Achats",
  "nav.group.hrFinance": "RH & finance",
  "nav.group.admin": "Administration",

  "nav.dashboard": "Tableau de bord",
  "nav.stock": "Stock",
  "nav.production": "Production",
  "nav.purchasing": "Achats & fournisseurs",
  "nav.orders": "Ventes & clients",
  "nav.hr": "Ressources humaines",
  "nav.finance": "Finance",
  "nav.zakati": "ZAKATI",
  "nav.users": "Utilisateurs",
  "nav.audit": "Journal d'activité",

  "page.dashboard.subtitle": "Vue d'ensemble de l'usine",
  "page.stock.subtitle": "Les 4 inventaires : produits chimiques, tige, pièces détachées, produits finis",
  "page.production.subtitle": "Lots de production, traçabilité des matières, écarts et pertes",
  "page.purchasing.subtitle": "Fournisseur → bon de commande → réception → stock",
  "page.orders.subtitle": "Commandes, factures et base clients",
  "page.hr.subtitle": "Employés, heures travaillées et absences",
  "page.finance.subtitle": "Calculateur de coût de revient et de marge, produit par produit",
  "page.zakati.subtitle": "Calcul, suivi et historique de la Zakat de l'entreprise",
  "page.users.subtitle": "Comptes, rôles et permissions",
  "page.audit.subtitle": "Qui a fait quoi, et quand",

  "app.loading": "Chargement…",

  "theme.toLight": "Passer en mode clair",
  "theme.toDark": "Passer en mode sombre",
  "theme.light": "Mode clair",
  "theme.dark": "Mode sombre",

  "language.switchTo": "Passer en {language}",

  "user.changePassword": "Changer mon mot de passe",
  "user.logout": "Se déconnecter",

  "login.subtitle": "Usine de chaussures — Alger",
  "login.identifier": "Identifiant",
  "login.password": "Mot de passe",
  "login.submit": "Se connecter",
  "login.submitting": "Connexion…",
  "login.missingFields": "Entrez votre identifiant et votre mot de passe.",
  "login.failed": "Connexion impossible.",
  "login.help": "Mot de passe oublié ? Demandez au gérant de le réinitialiser.",

  "password.title": "Changer mon mot de passe",
  "password.current": "Mot de passe actuel",
  "password.new": "Nouveau mot de passe",
  "password.confirm": "Confirmer le nouveau mot de passe",
  "password.hint": "Au moins {count} caractères.",
  "password.missingCurrent": "Entrez votre mot de passe actuel.",
  "password.tooShort": "Le nouveau mot de passe doit faire au moins {count} caractères.",
  "password.mismatch": "Les deux nouveaux mots de passe ne correspondent pas.",
  "password.failed": "Changement impossible.",
  "password.done": "Votre mot de passe a été changé. Il sera demandé à votre prochaine connexion.",
  "password.close": "Fermer",
  "password.cancel": "Annuler",
  "password.save": "Changer",
  "password.saving": "Enregistrement…",
} as const;

export type TranslationKey = keyof typeof fr;

const ar: Record<TranslationKey, string> = {
  "brand.name": "Harrix ERP",
  "brand.tagline": "نظام إدارة المصنع",
  "brand.creditPrefix": "تطوير وصيانة",
  "brand.creditNames": "سفيان وخليل",

  "nav.group.general": "عام",
  "nav.group.inventory": "الجرد",
  "nav.group.production": "الإنتاج",
  "nav.group.sales": "المبيعات",
  "nav.group.purchasing": "المشتريات",
  "nav.group.hrFinance": "الموارد البشرية والمالية",
  "nav.group.admin": "الإدارة",

  "nav.dashboard": "لوحة القيادة",
  "nav.stock": "المخزون",
  "nav.production": "الإنتاج",
  "nav.purchasing": "المشتريات والموردون",
  "nav.orders": "المبيعات والعملاء",
  "nav.hr": "الموارد البشرية",
  "nav.finance": "المالية",
  "nav.zakati": "زكاتي",
  "nav.users": "المستخدمون",
  "nav.audit": "سجل النشاط",

  "page.dashboard.subtitle": "نظرة عامة على المصنع",
  "page.stock.subtitle": "المخزونات الأربعة: المواد الكيميائية، الوجه، قطع الغيار، المنتجات النهائية",
  "page.production.subtitle": "دفعات الإنتاج، تتبّع المواد، الفوارق والخسائر",
  "page.purchasing.subtitle": "المورّد ← أمر شراء ← استلام ← مخزون",
  "page.orders.subtitle": "الطلبات والفواتير وقاعدة العملاء",
  "page.hr.subtitle": "الموظفون وساعات العمل والغيابات",
  "page.finance.subtitle": "حاسبة سعر التكلفة والهامش، منتجًا بمنتج",
  "page.zakati.subtitle": "حساب ومتابعة وتاريخ زكاة المؤسسة",
  "page.users.subtitle": "الحسابات والأدوار والصلاحيات",
  "page.audit.subtitle": "من فعل ماذا، ومتى",

  "app.loading": "جارٍ التحميل…",

  "theme.toLight": "التبديل إلى الوضع الفاتح",
  "theme.toDark": "التبديل إلى الوضع الداكن",
  "theme.light": "وضع فاتح",
  "theme.dark": "وضع داكن",

  "language.switchTo": "التبديل إلى {language}",

  "user.changePassword": "تغيير كلمة المرور",
  "user.logout": "تسجيل الخروج",

  "login.subtitle": "مصنع أحذية — الجزائر",
  "login.identifier": "المعرّف",
  "login.password": "كلمة المرور",
  "login.submit": "تسجيل الدخول",
  "login.submitting": "جارٍ الاتصال…",
  "login.missingFields": "أدخل المعرّف وكلمة المرور.",
  "login.failed": "تعذّر تسجيل الدخول.",
  "login.help": "نسيت كلمة المرور؟ اطلب من المسيّر إعادة تعيينها.",

  "password.title": "تغيير كلمة المرور",
  "password.current": "كلمة المرور الحالية",
  "password.new": "كلمة المرور الجديدة",
  "password.confirm": "تأكيد كلمة المرور الجديدة",
  "password.hint": "{count} أحرف على الأقل.",
  "password.missingCurrent": "أدخل كلمة المرور الحالية.",
  "password.tooShort": "يجب أن تحتوي كلمة المرور الجديدة على {count} أحرف على الأقل.",
  "password.mismatch": "كلمتا المرور الجديدتان غير متطابقتين.",
  "password.failed": "تعذّر تغيير كلمة المرور.",
  "password.done": "تم تغيير كلمة المرور. ستُطلب منك عند الاتصال القادم.",
  "password.close": "إغلاق",
  "password.cancel": "إلغاء",
  "password.save": "تغيير",
  "password.saving": "جارٍ الحفظ…",
};

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { fr, ar };

/** Replaces every {name} placeholder with the matching value. */
export function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  const raw = TRANSLATIONS[lang][key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
