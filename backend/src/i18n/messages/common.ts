import { catalogue } from '../catalogue.js';

/** Generic exception text shared by more than one domain. */
export const common = catalogue({
  'common.invalidMonth': { fr: 'Mois invalide (format AAAA-MM attendu).', ar: 'شهر غير صالح (الصيغة المتوقَّعة AAAA-MM).' },
  'common.taxRateFraction': {
    fr: 'Le taux de taxe se saisit en fraction (0,19 pour 19 %), pas en pourcentage brut.',
    ar: 'تُدخَل نسبة الرسم كجزء عشري (0.19 لـ19٪)، لا كنسبة مئوية خام.',
  },
  'common.discountRateFraction': {
    fr: 'La remise en pourcentage se saisit en fraction (0,10 pour 10 %), pas en pourcentage brut.',
    ar: 'يُدخَل التخفيض كجزء عشري (0.10 لـ10٪)، لا كنسبة مئوية خام.',
  },
  'common.unitMustBeUnit': {
    fr: "L'unité doit être une unité de mesure (kg, litre, pièce…), pas un nombre.",
    ar: 'يجب أن تكون الوحدة وحدة قياس (كغ، لتر، قطعة…)، لا عددًا.',
  },
  'common.timeFormat': { fr: '{field} doit être au format HH:MM.', ar: 'يجب أن يكون {field} بالصيغة HH:MM.' },
  'common.endBeforeStart': {
    fr: 'La date de fin ne peut pas précéder la date de début.',
    ar: 'لا يمكن أن يسبق تاريخ النهاية تاريخ البداية.',
  },
  'common.paymentExceedsBalance': {
    fr: 'Ce paiement ({amount} DZD) dépasse le solde restant dû ({remaining} DZD).',
    ar: 'هذه الدفعة ({amount} دج) تتجاوز الرصيد الباقي المستحق ({remaining} دج).',
  },
  'common.lotNumberRequiredFor': {
    fr: 'Le numéro de lot est obligatoire pour "{item}".',
    ar: 'رقم الدفعة إلزامي لـ"{item}".',
  },
  'common.expiryRequiredFor': {
    fr: 'La date de péremption est obligatoire pour "{item}".',
    ar: 'تاريخ الصلاحية إلزامي لـ"{item}".',
  },
  'common.fullNameRequired': { fr: 'Le nom complet est obligatoire.', ar: 'الاسم الكامل إلزامي.' },
  'common.emailInvalid': { fr: "L'adresse email n'est pas valide.", ar: 'البريد الإلكتروني غير صالح.' },
  'common.passwordMinLength': {
    fr: 'Le mot de passe doit faire au moins {count} caractères.',
    ar: 'يجب أن تتكوّن كلمة المرور من {count} أحرف على الأقل.',
  },
  // Gregorian month names for the analytics month picker and chart axes —
  // Arabic uses the Algerian (French-derived) forms, matching what the
  // frontend's Intl.DateTimeFormat('ar-DZ-u-nu-latn') already renders.
  'common.month.1': { fr: 'janvier', ar: 'جانفي' },
  'common.month.2': { fr: 'février', ar: 'فيفري' },
  'common.month.3': { fr: 'mars', ar: 'مارس' },
  'common.month.4': { fr: 'avril', ar: 'أفريل' },
  'common.month.5': { fr: 'mai', ar: 'ماي' },
  'common.month.6': { fr: 'juin', ar: 'جوان' },
  'common.month.7': { fr: 'juillet', ar: 'جويلية' },
  'common.month.8': { fr: 'août', ar: 'أوت' },
  'common.month.9': { fr: 'septembre', ar: 'سبتمبر' },
  'common.month.10': { fr: 'octobre', ar: 'أكتوبر' },
  'common.month.11': { fr: 'novembre', ar: 'نوفمبر' },
  'common.month.12': { fr: 'décembre', ar: 'ديسمبر' },
});
