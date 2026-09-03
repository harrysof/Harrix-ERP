import { catalogue } from '../catalogue.js';

export const stock = catalogue({
  'stock.itemNotFound': { fr: 'Article introuvable : {id}', ar: 'المادة غير موجودة: {id}' },
  'stock.unknownInventoryType': { fr: "Type d'inventaire inconnu : {id}", ar: 'نوع المخزون غير معروف: {id}' },
  'stock.referenceExists': {
    fr: 'Un article avec la référence "{reference}" existe déjà.',
    ar: 'توجد مادة أخرى تحمل المرجع "{reference}".',
  },
  'stock.itemHasMovements': {
    fr: '"{name}" a {count} mouvement(s) de stock et ne peut pas être supprimé — son historique serait orphelin. Archivez-le à la place.',
    ar: '"{name}" لها {count} حركة/حركات مخزون ولا يمكن حذفها — سيبقى سجلها التاريخي بلا مرجع. قم بأرشفتها بدل ذلك.',
  },
  'stock.itemUsedByProduction': {
    fr: '"{name}" est utilisé par au moins un lot de production et ne peut pas être supprimé. Archivez-le à la place.',
    ar: '"{name}" مستعملة في دفعة إنتاج واحدة على الأقل ولا يمكن حذفها. قم بأرشفتها بدل ذلك.',
  },
  'stock.lotNumberRequiredForType': {
    fr: 'Le numéro de lot est obligatoire pour ce type de produit.',
    ar: 'رقم الدفعة إلزامي لهذا النوع من المنتجات.',
  },
  'stock.expiryRequiredForType': {
    fr: 'La date de péremption est obligatoire pour ce type de produit.',
    ar: 'تاريخ الصلاحية إلزامي لهذا النوع من المنتجات.',
  },
  'stock.supplierNotFound': { fr: 'Fournisseur introuvable : {id}', ar: 'المورّد غير موجود: {id}' },
  'stock.chooseBatch': { fr: 'Choisissez un lot.', ar: 'اختر دفعة.' },
  'stock.batchNotFound': { fr: 'Lot introuvable : {id}', ar: 'الدفعة غير موجودة: {id}' },
  'stock.onlyAvailableInBatch': {
    fr: "Il n'y a que {available} {unit} disponible dans ce lot.",
    ar: 'لا يتوفر في هذه الدفعة سوى {available} {unit}.',
  },
  'stock.onlyAvailable': { fr: "Il n'y a que {available} {unit} disponible.", ar: 'لا يتوفر سوى {available} {unit}.' },
  'stock.typeHasNoQuality': {
    fr: 'Ce type de produit ne classifie pas la qualité de production.',
    ar: 'هذا النوع من المنتجات لا يصنّف جودة الإنتاج.',
  },
  'stock.unknownQualityClass': {
    fr: 'Classe de qualité inconnue : {quality} (attendue : {expected})',
    ar: 'فئة جودة غير معروفة: {quality} (المتوقَّع: {expected})',
  },
  'stock.source.manual': { fr: 'Réception directe', ar: 'استلام مباشر' },
  'stock.source.supplierOrder': { fr: 'Commande fournisseur', ar: 'طلبية مورّد' },
  'stock.source.purchase': { fr: 'Achat (bon de commande)', ar: 'شراء (سند طلب)' },
  'stock.source.production': { fr: 'Production', ar: 'إنتاج' },
  'stock.source.sale': { fr: 'Vente', ar: 'بيع' },
});
