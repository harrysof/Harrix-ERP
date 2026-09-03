import { catalogue } from '../catalogue.js';

export const production = catalogue({
  'production.batchNotFound': { fr: 'Lot de production introuvable : {id}', ar: 'دفعة الإنتاج غير موجودة: {id}' },
  'production.productNotFound': { fr: 'Produit introuvable : {id}', ar: 'المنتج غير موجود: {id}' },
  'production.productArchived': { fr: 'Le produit "{name}" est archivé.', ar: 'المنتج "{name}" مؤرشف.' },
  'production.codeExists': {
    fr: 'Un lot de production nommé "{code}" existe déjà.',
    ar: 'توجد دفعة إنتاج أخرى باسم "{code}".',
  },
  'production.batchCancelledNoMaterial': {
    fr: 'Ce lot est annulé — aucune matière ne peut plus y être ajoutée.',
    ar: 'هذه الدفعة ملغاة — لا يمكن إضافة أي مادة إليها بعد الآن.',
  },
  'production.outputAlreadyDeclared': {
    fr: 'La sortie de ce lot a déjà été déclarée.',
    ar: 'تم التصريح بمخرجات هذه الدفعة من قبل.',
  },
  'production.batchCancelledNoOutput': {
    fr: 'Ce lot est annulé — sa sortie ne peut pas être déclarée.',
    ar: 'هذه الدفعة ملغاة — لا يمكن التصريح بمخرجاتها.',
  },
  'production.materialNotFound': { fr: 'Matière introuvable : {id}', ar: 'المادة غير موجودة: {id}' },
  'production.notProductionMaterial': {
    fr: '"{name}" n\'est pas une matière de production.',
    ar: '"{name}" ليست مادة إنتاج.',
  },
  'production.chooseBatchFor': { fr: 'Choisissez un lot pour "{name}".', ar: 'اختر دفعة لـ"{name}".' },
  'production.batchNotFoundFor': {
    fr: 'Lot introuvable pour "{name}" : {id}',
    ar: 'الدفعة غير موجودة لـ"{name}": {id}',
  },
  'production.onlyRemainingInLot': {
    fr: 'Il ne reste que {available} {unit} dans le lot {batchNumber} de "{name}".',
    ar: 'لا يتبقى في الدفعة {batchNumber} من "{name}" سوى {available} {unit}.',
  },
  'production.onlyRemaining': { fr: 'Il ne reste que {available} {unit} de "{name}".', ar: 'لا يتبقى من "{name}" سوى {available} {unit}.' },
  'production.declareExpectedQuantity': {
    fr: 'Indiquez la quantité annoncée par la machine avant de déclarer la sortie.',
    ar: 'أدخل الكمية المُعلَنة من الآلة قبل التصريح بالمخرجات.',
  },
});
