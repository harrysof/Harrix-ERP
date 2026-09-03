import { catalogue } from '../catalogue.js';

export const finance = catalogue({
  'finance.costNotFound': { fr: 'Coût introuvable : {id}', ar: 'المصروف غير موجود: {id}' },
  'finance.chooseDifferentMonth': {
    fr: 'Choisissez un mois différent du mois affiché.',
    ar: 'اختر شهرًا مختلفًا عن الشهر المعروض.',
  },
  'finance.noCostsForMonth': { fr: 'Aucun coût enregistré pour {month}.', ar: 'لا توجد مصاريف مسجَّلة لشهر {month}.' },
  'finance.invalidSourceMonth': {
    fr: 'Mois source invalide (format AAAA-MM attendu).',
    ar: 'شهر المصدر غير صالح (الصيغة المتوقَّعة AAAA-MM).',
  },
  'finance.invalidTargetMonth': {
    fr: 'Mois cible invalide (format AAAA-MM attendu).',
    ar: 'شهر الهدف غير صالح (الصيغة المتوقَّعة AAAA-MM).',
  },
});
