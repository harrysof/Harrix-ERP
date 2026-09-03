import { catalogue } from '../catalogue.js';

export const hr = catalogue({
  'hr.employeeNotFound': { fr: 'Employé introuvable : {id}', ar: 'الموظف غير موجود: {id}' },
  'hr.cddNeedsEndDate': { fr: 'Un CDD doit avoir une date de fin de contrat.', ar: 'يجب أن يكون لعقد العمل المحدد المدة تاريخ نهاية.' },
  'hr.entryNotFound': { fr: 'Entrée introuvable : {id}', ar: 'الإدخال غير موجود: {id}' },
  'hr.absenceNotFound': { fr: 'Absence introuvable : {id}', ar: 'الغياب غير موجود: {id}' },
  'hr.absenceTypeInvalid': {
    fr: 'Le type doit être CONGE, MALADIE ou INJUSTIFIEE.',
    ar: 'يجب أن يكون النوع CONGE أو MALADIE أو INJUSTIFIEE.',
  },
  'hr.contractTypeInvalid': { fr: 'Le type de contrat doit être CDI ou CDD.', ar: 'يجب أن يكون نوع العقد CDI أو CDD.' },
  'hr.maritalStatusInvalid': { fr: 'Situation familiale invalide.', ar: 'الحالة الاجتماعية غير صالحة.' },
});
