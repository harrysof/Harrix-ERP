import { catalogue } from '../catalogue.js';

export const auth = catalogue({
  'auth.usernameRequired': { fr: "Le nom d'utilisateur est obligatoire.", ar: 'اسم المستخدم إلزامي.' },
  'auth.passwordRequired': { fr: 'Le mot de passe est obligatoire.', ar: 'كلمة المرور إلزامية.' },
  'auth.invalidCredentials': { fr: 'Identifiants incorrects.', ar: 'بيانات الاعتماد غير صحيحة.' },
  'auth.accountDeactivated': {
    fr: 'Ce compte a été désactivé. Contactez le gérant.',
    ar: 'عُطِّل هذا الحساب. تواصل مع المسيّر.',
  },
  'auth.accountNotFound': { fr: 'Compte introuvable.', ar: 'الحساب غير موجود.' },
  'auth.currentPasswordWrong': { fr: 'Mot de passe actuel incorrect.', ar: 'كلمة المرور الحالية غير صحيحة.' },
  'auth.newPasswordMinLength': {
    fr: 'Le nouveau mot de passe doit faire au moins {count} caractères.',
    ar: 'يجب أن تتكوّن كلمة المرور الجديدة من {count} أحرف على الأقل.',
  },
  'auth.authRequired': { fr: 'Authentification requise.', ar: 'المصادقة مطلوبة.' },
  'auth.sessionExpired': { fr: 'Session expirée ou invalide. Reconnectez-vous.', ar: 'انتهت الجلسة أو أنها غير صالحة. أعد تسجيل الدخول.' },
  'auth.invalidToken': { fr: 'Jeton invalide.', ar: 'الرمز غير صالح.' },
  'auth.accountDeactivatedShort': { fr: 'Ce compte a été désactivé.', ar: 'عُطِّل هذا الحساب.' },
  'auth.accessDenied': { fr: 'Accès refusé.', ar: 'الوصول مرفوض.' },
  'auth.roleForbids': {
    fr: "Votre rôle ({role}) ne permet pas cette action. Contactez le gérant si vous pensez que c'est une erreur.",
    ar: 'دورك ({role}) لا يسمح بهذا الإجراء. تواصل مع المسيّر إذا كنت تعتقد أن هذا خطأ.',
  },

  // ---------------------------------------------------- permission groups
  // Served verbatim to the frontend's Roles & permissions screen (see
  // users.controller.ts's permission-groups route) — these are the only
  // strings in this file that are prose shown in a settings screen rather
  // than an error banner.
  'perm.group.stock': { fr: 'Stock', ar: 'المخزون' },
  'perm.stock.read': { fr: 'Consulter le stock', ar: 'الاطّلاع على المخزون' },
  'perm.stock.write': { fr: 'Réceptions et sorties', ar: 'الاستلامات والمخرجات' },
  'perm.stock.manage': { fr: 'Créer, modifier, supprimer des articles', ar: 'إنشاء المواد وتعديلها وحذفها' },

  'perm.group.production': { fr: 'Production', ar: 'الإنتاج' },
  'perm.production.read': { fr: 'Consulter les lots et les pertes', ar: 'الاطّلاع على الدفعات والخسائر' },
  'perm.production.write': { fr: 'Créer des lots, déclarer les sorties', ar: 'إنشاء الدفعات والتصريح بالمخرجات' },

  'perm.group.suppliers': { fr: 'Fournisseurs', ar: 'الموردون' },
  'perm.suppliers.read': { fr: 'Consulter les fournisseurs', ar: 'الاطّلاع على الموردين' },
  'perm.suppliers.write': { fr: 'Créer et modifier les fournisseurs', ar: 'إنشاء الموردين وتعديلهم' },

  'perm.group.purchasing': { fr: 'Achats', ar: 'المشتريات' },
  'perm.purchasing.read': { fr: 'Consulter les bons de commande', ar: 'الاطّلاع على سندات الطلب' },
  'perm.purchasing.write': {
    fr: 'Créer des bons de commande et enregistrer les réceptions',
    ar: 'إنشاء سندات الطلب وتسجيل الاستلامات',
  },
  'perm.purchasing.approve': { fr: 'Approuver et annuler les bons de commande', ar: 'اعتماد سندات الطلب وإلغاؤها' },

  'perm.group.orders': { fr: 'Commandes & clients', ar: 'الطلبات والزبائن' },
  'perm.orders.read': { fr: 'Consulter les commandes', ar: 'الاطّلاع على الطلبات' },
  'perm.orders.write': { fr: 'Créer et expédier des commandes', ar: 'إنشاء الطلبات وإرسالها' },

  'perm.group.hr': { fr: 'Ressources humaines', ar: 'الموارد البشرية' },
  'perm.hr.read': { fr: 'Consulter les employés et les salaires', ar: 'الاطّلاع على الموظفين والأجور' },
  'perm.hr.write': { fr: 'Modifier les employés, heures et absences', ar: 'تعديل الموظفين والساعات والغيابات' },

  'perm.group.admin': { fr: 'Administration', ar: 'الإدارة' },
  'perm.users.manage': { fr: 'Créer et désactiver des utilisateurs', ar: 'إنشاء المستخدمين وتعطيلهم' },
  'perm.audit.read': { fr: "Consulter le journal d'activité", ar: 'الاطّلاع على سجلّ النشاط' },

  'perm.group.finance': { fr: 'Finance', ar: 'المالية' },
  'perm.finance.read': {
    fr: 'Utiliser le calculateur de marge, les coûts d’usine et le module Zakat',
    ar: 'استعمال حاسبة الهامش ومصاريف المصنع ووحدة الزكاة',
  },
  'perm.finance.write': {
    fr: "Ajouter des coûts d'usine et enregistrer des calculs de Zakat",
    ar: 'إضافة مصاريف المصنع وتسجيل حسابات الزكاة',
  },
});
