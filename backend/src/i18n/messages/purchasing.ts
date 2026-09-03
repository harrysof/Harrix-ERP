import { catalogue } from '../catalogue.js';

export const purchasing = catalogue({
  'purchasing.poNotFound': { fr: 'Bon de commande introuvable : {id}', ar: 'سند الطلب غير موجود: {id}' },
  'purchasing.supplierOrderNotFound': { fr: 'Commande fournisseur introuvable : {id}', ar: 'طلبية المورّد غير موجودة: {id}' },
  'purchasing.supplierNotFound': { fr: 'Fournisseur introuvable : {id}', ar: 'المورّد غير موجود: {id}' },
  'purchasing.supplierArchived': { fr: 'Le fournisseur "{name}" est archivé.', ar: 'المورّد "{name}" مؤرشف.' },
  'purchasing.depositExceedsTotal': {
    fr: 'Le paiement initial ({paid} DZD) dépasse le total du bon de commande ({total} DZD).',
    ar: 'الدفعة الأولى ({paid} دج) تتجاوز مجموع سند الطلب ({total} دج).',
  },
  'purchasing.codeExists': { fr: 'Un bon de commande "{code}" existe déjà.', ar: 'يوجد سند طلب آخر بالرمز "{code}".' },
  'purchasing.linesNotEditable': {
    fr: 'Les lignes de ce bon de commande ne peuvent plus être modifiées (statut : {status}). Créez un nouveau bon si nécessaire.',
    ar: 'لم يعد بالإمكان تعديل بنود سند الطلب هذا (الحالة: {status}). أنشئ سندًا جديدًا عند الحاجة.',
  },
  'purchasing.statusFromReceipts': {
    fr: 'Ce statut est déterminé par les réceptions enregistrées. Enregistrez une réception plutôt que de changer le statut à la main.',
    ar: 'تُحدَّد هذه الحالة تلقائيًا حسب الاستلامات المسجَّلة. سجّل استلامًا بدل تغيير الحالة يدويًا.',
  },
  'purchasing.poFullyReceived': { fr: 'Ce bon de commande est entièrement reçu.', ar: 'تم استلام سند الطلب هذا بالكامل.' },
  'purchasing.poHasReceiptsNoCancel': {
    fr: 'Ce bon de commande a déjà des réceptions — il ne peut pas être annulé. Le stock reçu reste reçu.',
    ar: 'سند الطلب هذا لديه استلامات مسجَّلة بالفعل — لا يمكن إلغاؤه. يبقى المخزون المستلَم كما هو.',
  },
  'purchasing.poCancelledNoPayment': {
    fr: 'Ce bon de commande est annulé — aucun paiement ne peut lui être associé.',
    ar: 'سند الطلب هذا ملغى — لا يمكن ربط أي دفعة به.',
  },
  'purchasing.poNotReceivableStatus': {
    fr: 'Un bon de commande au statut "{status}" ne peut pas être réceptionné. Approuvez-le d\'abord.',
    ar: 'لا يمكن استلام سند طلب في حالة "{status}". اعتمده أولًا.',
  },
  'purchasing.giveAtLeastOneLine': { fr: 'Indiquez au moins une ligne reçue.', ar: 'أدخل بندًا واحدًا مستلمًا على الأقل.' },
  'purchasing.orderLineNotFound': { fr: 'Ligne de commande introuvable : {id}', ar: 'بند الطلبية غير موجود: {id}' },
  'purchasing.onlyOwedRemaining': {
    fr: 'Il ne reste que {stillOwed} {unit} à recevoir pour "{name}". Cochez la sur-livraison si le fournisseur a livré davantage.',
    ar: 'لا يتبقى سوى {stillOwed} {unit} للاستلام من "{name}". فعّل خيار التجاوز في التسليم إذا سلّم المورّد كمية أكبر.',
  },
  'purchasing.poHasReceiptsNoDelete': {
    fr: 'Ce bon de commande a des réceptions et ne peut pas être supprimé. Son historique doit rester.',
    ar: 'سند الطلب هذا لديه استلامات ولا يمكن حذفه. يجب أن يبقى سجله التاريخي.',
  },
  'purchasing.onlyDraftDeletable': {
    fr: 'Seul un brouillon peut être supprimé. Annulez ce bon de commande à la place.',
    ar: 'لا يمكن حذف إلا المسودّات. ألغِ سند الطلب هذا بدل ذلك.',
  },
  'purchasing.itemNotFound': { fr: 'Article introuvable : {ids}', ar: 'المادة غير موجودة: {ids}' },
  'purchasing.itemArchived': { fr: 'Article archivé : {names}', ar: 'مادة مؤرشفة: {names}' },
  'purchasing.oneOrMoreRefsNotFound': {
    fr: 'Une ou plusieurs références de la commande sont introuvables.',
    ar: 'مرجع واحد أو أكثر من مراجع الطلبية غير موجود.',
  },
  'purchasing.orderAlreadyReceived': {
    fr: 'Cette commande a déjà été réceptionnée.',
    ar: 'تم استلام هذه الطلبية من قبل.',
  },
  'purchasing.orderDateRef': { fr: 'Commande du {date}', ar: 'طلبية بتاريخ {date}' },
});
