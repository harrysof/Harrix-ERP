import { catalogue } from "./catalogue";

/** Navigation, top bar, sign-in and account — everything outside a module page. */
export const shell = catalogue({
  "brand.name": { fr: "Harrix ERP", ar: "Harrix ERP" },
  "brand.tagline": { fr: "Système de gestion d'usine", ar: "نظام إدارة المصنع" },
  "brand.creditPrefix": { fr: "Développé et maintenu par", ar: "تطوير وصيانة" },
  "brand.creditNames": { fr: "Sofiane & Khalil", ar: "سفيان وخليل" },

  "nav.group.general": { fr: "Général", ar: "عام" },
  "nav.group.inventory": { fr: "Inventaire", ar: "المخزون" },
  "nav.group.production": { fr: "Production", ar: "الإنتاج" },
  "nav.group.sales": { fr: "Ventes", ar: "المبيعات" },
  "nav.group.purchasing": { fr: "Achats", ar: "المشتريات" },
  "nav.group.hrFinance": { fr: "RH & finance", ar: "الموارد البشرية والمالية" },
  "nav.group.admin": { fr: "Administration", ar: "الإدارة" },

  "nav.dashboard": { fr: "Tableau de bord", ar: "لوحة القيادة" },
  "nav.stock": { fr: "Stock", ar: "المخزون" },
  "nav.production": { fr: "Production", ar: "الإنتاج" },
  "nav.purchasing": { fr: "Achats & fournisseurs", ar: "المشتريات والموردون" },
  "nav.orders": { fr: "Ventes & clients", ar: "المبيعات والزبائن" },
  "nav.hr": { fr: "Ressources humaines", ar: "الموارد البشرية" },
  "nav.finance": { fr: "Finance", ar: "المالية" },
  "nav.zakati": { fr: "ZAKATI", ar: "زكاتي" },
  "nav.users": { fr: "Utilisateurs", ar: "المستخدمون" },
  "nav.audit": { fr: "Journal d'activité", ar: "سجل النشاط" },

  "page.dashboard.subtitle": { fr: "Vue d'ensemble de l'usine", ar: "نظرة عامة على المصنع" },
  "page.stock.subtitle": {
    fr: "Les 4 inventaires : produits chimiques, tige, pièces détachées, produits finis",
    ar: "المخزونات الأربعة: المواد الكيميائية، الوجه العلوي، قطع الغيار، المنتجات النهائية",
  },
  "page.production.subtitle": {
    fr: "Lots de production, traçabilité des matières, écarts et pertes",
    ar: "دفعات الإنتاج، تتبّع المواد، الفوارق والخسائر",
  },
  "page.purchasing.subtitle": {
    fr: "Fournisseur → bon de commande → réception → stock",
    ar: "المورّد ← سند الطلب ← الاستلام ← المخزون",
  },
  "page.orders.subtitle": { fr: "Commandes, factures et base clients", ar: "الطلبات والفواتير وقاعدة الزبائن" },
  "page.hr.subtitle": { fr: "Employés, heures travaillées et absences", ar: "الموظفون وساعات العمل والغيابات" },
  "page.finance.subtitle": {
    fr: "Calculateur de coût de revient et de marge, produit par produit",
    ar: "حاسبة سعر التكلفة والهامش، منتجًا بمنتج",
  },
  "page.zakati.subtitle": {
    fr: "Calcul, suivi et historique de la Zakat de l'entreprise",
    ar: "حساب زكاة المؤسسة ومتابعتها وسجلّها",
  },
  "page.users.subtitle": { fr: "Comptes, rôles et permissions", ar: "الحسابات والأدوار والصلاحيات" },
  "page.audit.subtitle": { fr: "Qui a fait quoi, et quand", ar: "من فعل ماذا، ومتى" },

  "app.loading": { fr: "Chargement…", ar: "جارٍ التحميل…" },

  "theme.toLight": { fr: "Passer en mode clair", ar: "التبديل إلى الوضع الفاتح" },
  "theme.toDark": { fr: "Passer en mode sombre", ar: "التبديل إلى الوضع الداكن" },
  "theme.light": { fr: "Mode clair", ar: "الوضع الفاتح" },
  "theme.dark": { fr: "Mode sombre", ar: "الوضع الداكن" },

  "language.switchTo": { fr: "Passer en {language}", ar: "التبديل إلى {language}" },

  "user.changePassword": { fr: "Changer mon mot de passe", ar: "تغيير كلمة المرور" },
  "user.logout": { fr: "Se déconnecter", ar: "تسجيل الخروج" },

  "login.identifier": { fr: "Identifiant", ar: "المعرّف" },
  "login.password": { fr: "Mot de passe", ar: "كلمة المرور" },
  "login.submit": { fr: "Se connecter", ar: "تسجيل الدخول" },
  "login.submitting": { fr: "Connexion…", ar: "جارٍ الاتصال…" },
  "login.missingFields": {
    fr: "Entrez votre identifiant et votre mot de passe.",
    ar: "أدخل المعرّف وكلمة المرور.",
  },
  "login.failed": { fr: "Connexion impossible.", ar: "تعذّر تسجيل الدخول." },
  "login.help": {
    fr: "Mot de passe oublié ? Demandez au gérant de le réinitialiser.",
    ar: "نسيت كلمة المرور؟ اطلب من المسيّر إعادة تعيينها.",
  },

  "password.title": { fr: "Changer mon mot de passe", ar: "تغيير كلمة المرور" },
  "password.current": { fr: "Mot de passe actuel", ar: "كلمة المرور الحالية" },
  "password.new": { fr: "Nouveau mot de passe", ar: "كلمة المرور الجديدة" },
  "password.confirm": { fr: "Confirmer le nouveau mot de passe", ar: "تأكيد كلمة المرور الجديدة" },
  "password.hint": { fr: "Au moins {count} caractères.", ar: "{count} أحرف على الأقل." },
  "password.missingCurrent": { fr: "Entrez votre mot de passe actuel.", ar: "أدخل كلمة المرور الحالية." },
  "password.tooShort": {
    fr: "Le nouveau mot de passe doit faire au moins {count} caractères.",
    ar: "يجب أن تتكوّن كلمة المرور الجديدة من {count} أحرف على الأقل.",
  },
  "password.mismatch": {
    fr: "Les deux nouveaux mots de passe ne correspondent pas.",
    ar: "كلمتا المرور الجديدتان غير متطابقتين.",
  },
  "password.failed": { fr: "Changement impossible.", ar: "تعذّر التغيير." },
  "password.done": {
    fr: "Votre mot de passe a été changé. Il sera demandé à votre prochaine connexion.",
    ar: "تم تغيير كلمة المرور. ستُطلب منك عند تسجيل الدخول القادم.",
  },
  "password.close": { fr: "Fermer", ar: "إغلاق" },
  "password.cancel": { fr: "Annuler", ar: "إلغاء" },
  "password.save": { fr: "Changer", ar: "تغيير" },
  "password.saving": { fr: "Enregistrement…", ar: "جارٍ الحفظ…" },
  "session.expired": {
    fr: "Votre session a expiré ou votre compte a été désactivé. Reconnectez-vous.",
    ar: "انتهت جلستك أو عُطِّل حسابك. أعد تسجيل الدخول.",
  },
  "error.serverUnreachable": {
    fr: "Impossible de joindre le serveur. Vérifiez que le backend est démarré.",
    ar: "تعذّر الاتصال بالخادم. تحقّق من أن الخادم الخلفي يعمل.",
  },
});
