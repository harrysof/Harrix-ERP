import { catalogue } from '../catalogue.js';

export const settings = catalogue({
  'settings.expiryNeedsBatches': {
    fr: 'Une péremption se suit par lot : activez aussi le suivi par lot, sinon la date ne se rattacherait à rien.',
    ar: 'تُتابَع الصلاحية عبر الدفعات: فعّل تتبع الدفعات أيضًا، وإلا فلن يرتبط التاريخ بشيء.',
  },
  'settings.expiryNeedsBatchesKept': {
    fr: 'Une péremption se suit par lot : gardez le suivi par lot activé, sinon la date ne se rattacherait à rien.',
    ar: 'تُتابَع الصلاحية عبر الدفعات: أبقِ تتبع الدفعات مفعّلًا، وإلا فلن يرتبط التاريخ بشيء.',
  },
  'settings.typeKeyExists': {
    fr: 'Un type d\'inventaire avec la clé "{key}" existe déjà.',
    ar: 'يوجد نوع مخزون آخر بالمفتاح "{key}".',
  },
  'settings.typeNotFound': { fr: "Type d'inventaire introuvable : {id}", ar: 'نوع المخزون غير موجود: {id}' },
  'settings.batchTrackingHasLots': {
    fr: 'Ce type a déjà {count} lot(s) enregistré(s) — le suivi par lot ne peut plus être désactivé sans rendre ce stock invisible.',
    ar: 'يحتوي هذا النوع بالفعل على {count} دفعة/دفعات مسجَّلة — لا يمكن إلغاء تفعيل تتبع الدفعات دون أن يصبح هذا المخزون غير مرئي.',
  },
  'settings.typeHasItems': {
    fr: '"{label}" contient {count} article(s) et ne peut pas être supprimé. Supprimez ou archivez d\'abord ses articles.',
    ar: 'يحتوي "{label}" على {count} مادة/مواد ولا يمكن حذفه. احذف أو أرشف مواده أولًا.',
  },
  'settings.keyPattern': {
    fr: 'La clé ne peut contenir que des minuscules, des chiffres et des tirets (ex. "emballages").',
    ar: 'لا يمكن أن يحتوي المفتاح إلا على أحرف لاتينية صغيرة وأرقام وشرطات (مثال: "emballages").',
  },
});
