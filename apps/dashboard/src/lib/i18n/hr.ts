import { catalogue } from "./catalogue";

/**
 * Ressources humaines: the employee file, the payroll estimate, and the
 * monthly attendance ledger.
 *
 * Two Algerian administrative terms are kept as-is in both languages because
 * they are what appears on the actual forms: CNAS (the social-security fund)
 * and IRG (income tax). NIN and RIB likewise. Translating them would make the
 * screen disagree with the paperwork the employee is holding.
 */
export const hr = catalogue({
  // ------------------------------------------------------------------- tabs
  "hr.tabEmployees": { fr: "Employés", ar: "الموظفون" },
  "hr.tabAttendance": { fr: "Présence", ar: "الحضور" },

  // --------------------------------------------------------------- contract
  "contract.CDI": { fr: "CDI — durée indéterminée", ar: "عقد غير محدّد المدة" },
  "contract.CDD": { fr: "CDD — durée déterminée", ar: "عقد محدّد المدة" },
  "marital.CELIBATAIRE": { fr: "Célibataire", ar: "أعزب/عزباء" },
  "marital.MARIE": { fr: "Marié(e)", ar: "متزوّج(ة)" },
  "marital.DIVORCE": { fr: "Divorcé(e)", ar: "مطلّق(ة)" },
  "marital.VEUF": { fr: "Veuf/Veuve", ar: "أرمل(ة)" },
  "absence.CONGE": { fr: "Congé", ar: "عطلة" },
  "absence.MALADIE": { fr: "Maladie", ar: "مرض" },
  "absence.INJUSTIFIEE": { fr: "Absence injustifiée", ar: "غياب غير مبرَّر" },

  // ------------------------------------------------------------- list page
  "hr.loadFailed": { fr: "Impossible de charger les employés.", ar: "تعذّر تحميل الموظفين." },
  "hr.search": { fr: "Rechercher un employé…", ar: "البحث عن موظف…" },
  "hr.newEmployee": { fr: "+ Nouvel employé", ar: "+ موظف جديد" },
  "hr.noMatch": { fr: "Aucun employé ne correspond à la recherche", ar: "لا يوجد موظف مطابق للبحث" },
  "hr.none": { fr: "Aucun employé enregistré", ar: "لا يوجد موظف مسجّل" },
  "hr.activeEmployees": { fr: "Employés actifs", ar: "الموظفون النشطون" },
  "hr.archivedCount": { fr: "{count} archivé(s)", ar: "{count} مؤرشف" },
  "hr.onCDI": { fr: "Sous contrat CDI", ar: "بعقد غير محدّد المدة" },
  "hr.grossPayroll": { fr: "Masse salariale brute", ar: "كتلة الأجور الإجمالية" },
  "hr.grossPayrollHint": { fr: "Mensuelle, employés actifs", ar: "شهرية، للموظفين النشطين" },
  "hr.cddEnding": { fr: "CDD arrivant à échéance", ar: "عقود محدّدة المدة قاربت نهايتها" },
  "hr.cddEndingHint": { fr: "Dans les 30 prochains jours", ar: "خلال الثلاثين يومًا القادمة" },
  "hr.col.position": { fr: "Poste", ar: "المنصب" },
  "hr.col.contract": { fr: "Contrat", ar: "العقد" },
  "hr.col.hiredOn": { fr: "Embauché le", ar: "وُظِّف في" },
  "hr.col.tenure": { fr: "Ancienneté", ar: "الأقدمية" },
  "hr.col.grossSalary": { fr: "Salaire brut", ar: "الأجر الإجمالي" },

  // ----------------------------------------------------------------- tenure
  "hr.tenureYears": { fr: "{count} an(s)", ar: "{count} سنة" },
  "hr.tenureMonths": { fr: "{count} mois", ar: "{count} شهر" },
  "hr.tenureDays": { fr: "{count} j", ar: "{count} ي" },

  // ------------------------------------------------------------ employee form
  "hr.newTitle": { fr: "Nouvel employé", ar: "موظف جديد" },
  "hr.editTitle": { fr: "Modifier — {name}", ar: "تعديل — {name}" },
  "hr.add": { fr: "Ajouter l'employé", ar: "إضافة الموظف" },
  "hr.identity": { fr: "Identité", ar: "الهوية" },
  "hr.emergencyContact": { fr: "Contact d'urgence", ar: "جهة الاتصال في الطوارئ" },
  "hr.birthDate": { fr: "Date de naissance", ar: "تاريخ الميلاد" },
  "hr.nin": { fr: "NIN", ar: "رقم التعريف الوطني (NIN)" },
  "hr.ninHint": {
    fr: "Numéro d'identification nationale, facultatif",
    ar: "رقم التعريف الوطني، اختياري",
  },
  "hr.cnasNumber": { fr: "N° CNAS", ar: "رقم CNAS" },
  "hr.cnasHint": {
    fr: "Immatriculation sécurité sociale, facultatif",
    ar: "رقم التسجيل في الضمان الاجتماعي، اختياري",
  },
  "hr.hireDate": { fr: "Date d'embauche", ar: "تاريخ التوظيف" },
  "hr.contractType": { fr: "Type de contrat", ar: "نوع العقد" },
  "hr.contractEnd": { fr: "Fin de contrat", ar: "نهاية العقد" },
  "hr.maritalStatus": { fr: "Situation familiale", ar: "الحالة العائلية" },
  "hr.maritalHint": {
    fr: "Utile pour l'allocation familiale CNAS",
    ar: "مفيدة للمنحة العائلية لدى CNAS",
  },
  "hr.dependents": { fr: "Enfants à charge", ar: "الأطفال المكفولون" },
  "hr.salary": { fr: "Salaire brut (DZD/mois)", ar: "الأجر الإجمالي (دج/شهر)" },
  "hr.expectedHours": { fr: "Heures prévues / jour", ar: "الساعات المتوقَّعة / يوم" },
  "hr.expectedHoursHint": { fr: "Utilisé pour le résumé du mois", ar: "تُستعمل في ملخّص الشهر" },
  "hr.rib": { fr: "RIB", ar: "الحساب البنكي (RIB)" },
  "hr.ribHint": {
    fr: "Compte de versement du salaire, facultatif",
    ar: "حساب صبّ الأجر، اختياري",
  },
  "hr.unspecified": { fr: "— Non précisé —", ar: "— غير محدَّد —" },
  "hr.err.nameAndPosition": {
    fr: "Le nom complet et le poste sont obligatoires.",
    ar: "الاسم الكامل والمنصب إلزاميان.",
  },
  "hr.err.salary": { fr: "Le salaire doit être un nombre positif.", ar: "يجب أن يكون الأجر عددًا موجبًا." },
  "hr.err.hours": {
    fr: "Les heures prévues par jour doivent être comprises entre 1 et 24.",
    ar: "يجب أن تكون الساعات المتوقَّعة يوميًا بين 1 و24.",
  },
  "hr.err.cddEnd": {
    fr: "Un CDD doit avoir une date de fin de contrat.",
    ar: "يجب أن يحمل العقد محدّد المدة تاريخ نهاية.",
  },

  // ---------------------------------------------------------- employee fiche
  "hr.fileTitle": { fr: "Fiche employé", ar: "بطاقة الموظف" },
  "hr.loadFileFailed": { fr: "Impossible de charger la fiche.", ar: "تعذّر تحميل البطاقة." },
  "hr.status": { fr: "Statut", ar: "الحالة" },
  "hr.tenure": { fr: "Ancienneté", ar: "الأقدمية" },
  "hr.hoursPerDay": { fr: "Heures prévues / jour", ar: "الساعات المتوقَّعة / يوم" },
  "hr.today": { fr: "Aujourd'hui", ar: "اليوم" },
  "hr.cddBanner": {
    fr: "Contrat à durée déterminée — fin le {date}{warning}",
    ar: "عقد محدّد المدة — ينتهي في {date}{warning}",
  },
  "hr.cddSoon": { fr: ". Moins de 30 jours restants.", ar: ". يتبقّى أقل من 30 يومًا." },
  "hr.grossPay": { fr: "Salaire brut", ar: "الأجر الإجمالي" },
  "hr.monthly": { fr: "Mensuel", ar: "شهري" },
  "hr.cnasEmployee": { fr: "CNAS salarié", ar: "اشتراك CNAS للأجير" },
  "hr.cnasRate": { fr: "9 % du brut", ar: "9 ٪ من الإجمالي" },
  "hr.irgEstimate": { fr: "IRG estimé", ar: "الضريبة IRG التقديرية" },
  "hr.irgHint": { fr: "Estimation — voir avertissement", ar: "تقدير — انظر التنبيه" },
  "hr.netEstimate": { fr: "Net estimé", ar: "الصافي التقديري" },
  "hr.netFormula": { fr: "Brut − CNAS − IRG", ar: "الإجمالي − CNAS − IRG" },
  "hr.irgWarningLead": { fr: "estimation de planification", ar: "تقدير للتخطيط" },
  "hr.irgWarning": {
    fr: "L'IRG affiché est une {lead}, calculée par tranches sur le barème simplifié de 2022, sans le lissage (décote) que la loi applique à l'entrée de chaque tranche. Vérifiez avec votre expert-comptable avant toute utilisation sur un bulletin de paie réel.",
    ar: "الضريبة IRG المعروضة هي {lead}، محسوبة بالشرائح على السلّم المبسّط لسنة 2022، دون التخفيف (décote) الذي يطبّقه القانون عند مدخل كل شريحة. تحقّق مع محاسبك قبل أي استعمال على كشف أجر حقيقي.",
  },
  "hr.identityAdmin": { fr: "Identité et administratif", ar: "الهوية والإدارة" },
  "hr.recentHours": { fr: "Heures récentes", ar: "الساعات الأخيرة" },
  "hr.noHours": { fr: "Aucune heure enregistrée.", ar: "لم تُسجَّل أي ساعة." },
  "hr.source": { fr: "Source", ar: "المصدر" },
  "hr.sourceDevice": { fr: "Pointeuse", ar: "جهاز البصمة" },
  "hr.sourceManual": { fr: "Manuel", ar: "يدوي" },
  "hr.leave": { fr: "Congés", ar: "العطل" },
  "hr.noLeave": { fr: "Aucun congé enregistré.", ar: "لم تُسجَّل أي عطلة." },
  "hr.leaveDaysTotal": { fr: "{count} jour(s) au total", ar: "{count} يومًا في المجموع" },
  "hr.otherAbsences": { fr: "Autres absences", ar: "غيابات أخرى" },
  "hr.noOtherAbsences": { fr: "Aucune autre absence enregistrée.", ar: "لم تُسجَّل غيابات أخرى." },
  "hr.confirmDelete": { fr: "Supprimer définitivement {name} ?", ar: "حذف {name} نهائيًا؟" },

  // ------------------------------------------------------------- attendance
  "att.loadFailed": { fr: "Impossible de charger la présence.", ar: "تعذّر تحميل الحضور." },
  "att.monthSummary": { fr: "Résumé du mois", ar: "ملخّص الشهر" },
  "att.noActiveEmployee": { fr: "Aucun employé actif.", ar: "لا يوجد موظف نشط." },
  "att.col.expectedHours": { fr: "Heures prévues", ar: "الساعات المتوقَّعة" },
  "att.col.workedHours": { fr: "Heures travaillées", ar: "الساعات المشتغَلة" },
  "att.col.overtime": { fr: "Heures supp.", ar: "ساعات إضافية" },
  "att.col.sickDays": { fr: "Maladie (j)", ar: "مرض (ي)" },
  "att.col.unjustifiedDays": { fr: "Absence injustifiée (j)", ar: "غياب غير مبرَّر (ي)" },
  "att.overtimeSection": { fr: "Heures supplémentaires", ar: "الساعات الإضافية" },
  "att.noOvertime": { fr: "Aucune heure supplémentaire ce mois-ci.", ar: "لا توجد ساعات إضافية هذا الشهر." },
  "att.addOvertime": { fr: "Ajouter les heures supplémentaires", ar: "إضافة الساعات الإضافية" },
  "att.unjustifiedSection": { fr: "Absences injustifiées", ar: "الغيابات غير المبرَّرة" },
  "att.noUnjustified": {
    fr: "Aucune absence injustifiée ce mois-ci.",
    ar: "لا توجد غيابات غير مبرَّرة هذا الشهر.",
  },
  "att.saveAbsence": { fr: "Enregistrer l'absence", ar: "حفظ الغياب" },
  "att.addEntry": { fr: "Ajouter l'entrée", ar: "إضافة الإدخال" },
  "att.choose": { fr: "— Choisir —", ar: "— اختر —" },
  "att.hours": { fr: "Heures", ar: "الساعات" },
  "att.reasonOptional": { fr: "Raison (optionnel)", ar: "السبب (اختياري)" },
  "att.absence": { fr: "Absence", ar: "غياب" },

  "hr.contractSection": { fr: "Contrat", ar: "العقد" },
  "hr.paySection": { fr: "Rémunération", ar: "الأجر" },

  "hr.recentOvertime": { fr: "Heures supplémentaires récentes", ar: "الساعات الإضافية الأخيرة" },
  "hr.noOvertime": { fr: "Aucune heure supplémentaire enregistrée.", ar: "لم تُسجَّل أي ساعة إضافية." },
  "hr.recentAbsences": { fr: "Absences récentes", ar: "الغيابات الأخيرة" },
  "hr.noAbsences": { fr: "Aucune absence enregistrée.", ar: "لم يُسجَّل أي غياب." },
  "hr.leaveTotal": {
    fr: "{count} de congé au total sur les entrées ci-dessous.",
    ar: "{count} من العطلة في المجموع على الإدخالات أدناه.",
  },
  "hr.dayCount.one": { fr: "{count} jour", ar: "يوم واحد" },
  "hr.dayCount.two": { fr: "{count} jours", ar: "يومان" },
  "hr.dayCount.few": { fr: "{count} jours", ar: "{count} أيام" },
  "hr.dayCount.other": { fr: "{count} jours", ar: "{count} يومًا" },

  "att.workedHours": { fr: "Heures travaillées", ar: "الساعات المشتغَلة" },
  "att.monthLabel": { fr: "Mois", ar: "الشهر" },
  "att.employees": { fr: "Employés", ar: "الموظفون" },
  "att.unjustifiedAbsences": { fr: "Absences injustifiées", ar: "الغيابات غير المبرَّرة" },
  "att.daysSuffix": { fr: "{count} j", ar: "{count} ي" },
  "att.expectedFormula": {
    fr: "Heures prévues = heures/jour définies sur la fiche de chaque employé × jours de {month}.",
    ar: "الساعات المتوقَّعة = ساعات/يوم المحدَّدة في بطاقة كل موظف × أيام {month}.",
  },
});
