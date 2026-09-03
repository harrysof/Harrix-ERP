import { catalogue } from '../catalogue.js';

export const sales = catalogue({
  'sales.customerNotFound': { fr: 'Client introuvable : {id}', ar: 'الزبون غير موجود: {id}' },
  'sales.customerCodeExists': { fr: 'Un client "{code}" existe déjà.', ar: 'يوجد زبون آخر بالرمز "{code}".' },
  'sales.customerHasOrders': {
    fr: '{name} a {count} commande(s) et ne peut pas être supprimé — son historique serait orphelin. Archivez-le à la place.',
    ar: 'لدى {name} {count} طلبية/طلبيات ولا يمكن حذفه — سيبقى سجله التاريخي بلا مرجع. قم بأرشفته بدل ذلك.',
  },
  'sales.orderNotFound': { fr: 'Commande introuvable : {id}', ar: 'الطلبية غير موجودة: {id}' },
  'sales.orderCustomerNotFound': { fr: 'Client introuvable : {id}', ar: 'الزبون غير موجود: {id}' },
  'sales.customerArchived': { fr: 'Le client "{name}" est archivé.', ar: 'الزبون "{name}" مؤرشف.' },
  'sales.depositExceedsTotal': {
    fr: 'Le paiement initial ({paid} DZD) dépasse le total de la commande ({total} DZD).',
    ar: 'الدفعة الأولى ({paid} دج) تتجاوز مجموع الطلبية ({total} دج).',
  },
  'sales.orderCodeExists': { fr: 'Une commande "{code}" existe déjà.', ar: 'توجد طلبية أخرى بالرمز "{code}".' },
  'sales.orderNotEditable': {
    fr: 'Une commande expédiée ou annulée ne peut plus être modifiée — ses lignes ont déjà bougé le stock.',
    ar: 'لا يمكن تعديل طلبية مُرسَلة أو ملغاة — بنودها حرّكت المخزون بالفعل.',
  },
  'sales.orderAlreadyShipped': { fr: 'Cette commande est déjà expédiée.', ar: 'تم إرسال هذه الطلبية بالفعل.' },
  'sales.orderCancelled': { fr: 'Cette commande est annulée.', ar: 'هذه الطلبية ملغاة.' },
  'sales.orderNoLines': { fr: 'Cette commande ne contient aucune ligne.', ar: 'لا تحتوي هذه الطلبية على أي بند.' },
  'sales.insufficientStock': {
    fr: 'Stock insuffisant pour "{name}" : {available} {unit} disponible(s), {requested} demandé(s).',
    ar: 'المخزون غير كافٍ لـ"{name}": المتوفر {available} {unit}، المطلوب {requested}.',
  },
  'sales.onlyReturnableRemaining': {
    fr: 'Il ne reste que {stillReturnable} {unit} retournable(s) pour "{name}".',
    ar: 'لا يتبقى سوى {stillReturnable} {unit} قابلة للإرجاع من "{name}".',
  },
  'sales.onlyShippedReturnable': {
    fr: 'Seule une commande expédiée peut faire l\'objet d\'un retour.',
    ar: 'لا يمكن إرجاع إلا الطلبيات المُرسَلة.',
  },
  'sales.giveAtLeastOneReturnedLine': { fr: 'Indiquez au moins une ligne retournée.', ar: 'أدخل بندًا واحدًا مرتجعًا على الأقل.' },
  'sales.orderLineNotFound': { fr: 'Ligne de commande introuvable : {id}', ar: 'بند الطلبية غير موجود: {id}' },
  'sales.useShipAction': {
    fr: "Utilisez l'action « Expédier » : l'expédition doit décrémenter le stock.",
    ar: 'استعمل إجراء «إرسال»: يجب أن يخصم الإرسال من المخزون.',
  },
  'sales.shippedCannotCancel': {
    fr: 'Une commande expédiée ne peut pas être annulée — le stock est déjà sorti.',
    ar: 'لا يمكن إلغاء طلبية مُرسَلة — خرج المخزون بالفعل.',
  },
  'sales.orderAlreadyCancelled': { fr: 'Cette commande est déjà annulée.', ar: 'هذه الطلبية ملغاة بالفعل.' },
  'sales.shippedCannotRevertPending': {
    fr: 'Une commande expédiée ne peut pas revenir en attente.',
    ar: 'لا يمكن لطلبية مُرسَلة أن تعود إلى حالة الانتظار.',
  },
  'sales.orderCancelledNoPayment': {
    fr: 'Cette commande est annulée — aucun paiement ne peut lui être associé.',
    ar: 'هذه الطلبية ملغاة — لا يمكن ربط أي دفعة بها.',
  },
  'sales.shippedCannotDelete': {
    fr: 'Une commande expédiée ne peut pas être supprimée — elle a généré des mouvements de stock. Son historique doit rester.',
    ar: 'لا يمكن حذف طلبية مُرسَلة — فقد ولّدت حركات مخزون. يجب أن يبقى سجلها التاريخي.',
  },
  'sales.productNotFound': { fr: 'Produit introuvable : {names}', ar: 'المنتج غير موجود: {names}' },
  'sales.productArchived': { fr: 'Produit archivé : {names}', ar: 'منتج مؤرشف: {names}' },
});
