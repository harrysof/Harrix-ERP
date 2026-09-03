import { catalogue } from '../catalogue.js';

export const zakat = catalogue({
  'zakat.calculationNotFound': { fr: 'Calcul de Zakat introuvable : {id}', ar: 'حساب الزكاة غير موجود: {id}' },
  'zakat.goldPriceUnavailable': {
    fr: "Impossible de récupérer le prix de l'or automatiquement, et aucune valeur n'est en cache. Saisissez-le manuellement.",
    ar: 'تعذّر جلب سعر الذهب تلقائيًا، ولا توجد قيمة محفوظة مسبقًا. أدخله يدويًا.',
  },
  // Hijri calendar vocabulary, used by zakat-math.ts's formatHijri() — the
  // French transliteration is the scientific spelling used in the app's
  // fiche technique; the Arabic is the calendar's own names, not a gloss.
  'zakat.hijriMonth.1': { fr: 'Mouharram', ar: 'محرم' },
  'zakat.hijriMonth.2': { fr: 'Safar', ar: 'صفر' },
  'zakat.hijriMonth.3': { fr: "Rabi' al-Awwal", ar: 'ربيع الأول' },
  'zakat.hijriMonth.4': { fr: "Rabi' ath-Thani", ar: 'ربيع الآخر' },
  'zakat.hijriMonth.5': { fr: 'Joumada al-Oula', ar: 'جمادى الأولى' },
  'zakat.hijriMonth.6': { fr: 'Joumada ath-Thania', ar: 'جمادى الآخرة' },
  'zakat.hijriMonth.7': { fr: 'Rajab', ar: 'رجب' },
  'zakat.hijriMonth.8': { fr: "Cha'ban", ar: 'شعبان' },
  'zakat.hijriMonth.9': { fr: 'Ramadan', ar: 'رمضان' },
  'zakat.hijriMonth.10': { fr: 'Chawwal', ar: 'شوال' },
  'zakat.hijriMonth.11': { fr: "Dhou al-Qi'da", ar: 'ذو القعدة' },
  'zakat.hijriMonth.12': { fr: 'Dhou al-Hijja', ar: 'ذو الحجة' },
  'zakat.methodologyInvalid': { fr: 'La méthodologie doit être LUNAR ou SOLAR.', ar: 'يجب أن تكون المنهجية LUNAR أو SOLAR.' },
});
