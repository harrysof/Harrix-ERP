import { catalogue } from '../catalogue.js';

export const users = catalogue({
  'users.userNotFound': { fr: 'Utilisateur introuvable : {id}', ar: 'المستخدم غير موجود: {id}' },
  'users.unknownRole': { fr: 'Rôle inconnu : {id}', ar: 'الدور غير معروف: {id}' },
  'users.loginExists': {
    fr: 'Un utilisateur avec l\'identifiant "{login}" existe déjà.',
    ar: 'يوجد مستخدم آخر بالمعرّف "{login}".',
  },
  'users.cannotChangeOwnRole': {
    fr: 'Vous ne pouvez pas changer votre propre rôle. Demandez à un autre gérant.',
    ar: 'لا يمكنك تغيير دورك الخاص. اطلب من مسيّر آخر القيام بذلك.',
  },
  'users.loginExistsGeneric': {
    fr: 'Un utilisateur avec cet identifiant existe déjà.',
    ar: 'يوجد مستخدم آخر بهذا المعرّف.',
  },
  'users.cannotDeactivateSelf': {
    fr: 'Vous ne pouvez pas désactiver votre propre compte.',
    ar: 'لا يمكنك تعطيل حسابك الخاص.',
  },
  'users.roleKeyExists': { fr: 'Un rôle nommé "{key}" existe déjà.', ar: 'يوجد دور آخر بالاسم "{key}".' },
  'users.roleNotFound': { fr: 'Rôle introuvable : {id}', ar: 'الدور غير موجود: {id}' },
  'users.protectedRolePermissionsLocked': {
    fr: 'Les permissions du rôle "{label}" ne peuvent pas être modifiées — c\'est le rôle qui garantit l\'accès à l\'administration.',
    ar: 'لا يمكن تعديل صلاحيات الدور "{label}" — فهو الدور الذي يضمن الوصول إلى الإدارة.',
  },
  'users.protectedRoleCannotDelete': { fr: 'Le rôle "{label}" ne peut pas être supprimé.', ar: 'لا يمكن حذف الدور "{label}".' },
  'users.roleInUse': {
    fr: '{count} utilisateur(s) ont le rôle "{label}". Changez leur rôle avant de le supprimer.',
    ar: 'يحمل {count} مستخدم/مستخدمون الدور "{label}". غيّر دورهم قبل حذفه.',
  },
  'users.lastAdministrator': {
    fr: "C'est le dernier compte capable de gérer les utilisateurs. Donnez ce rôle à quelqu'un d'autre avant de le désactiver.",
    ar: 'هذا آخر حساب قادر على إدارة المستخدمين. امنح هذا الدور لشخص آخر قبل تعطيله.',
  },
  'users.unknownPermissions': { fr: 'Permission(s) inconnue(s) : {names}', ar: 'صلاحية/صلاحيات غير معروفة: {names}' },
  'users.loginPattern': {
    fr: "L'identifiant ne peut contenir que des lettres, chiffres, points, tirets et underscores.",
    ar: 'لا يمكن أن يحتوي المعرّف إلا على أحرف وأرقام ونقاط وشرطات وشرطات سفلية.',
  },
  'users.roleKeyPattern': {
    fr: 'La clé du rôle doit être en minuscules, sans espaces (ex. "chef-equipe").',
    ar: 'يجب أن يكون مفتاح الدور بأحرف صغيرة، بدون فراغات (مثال: "chef-equipe").',
  },
});
