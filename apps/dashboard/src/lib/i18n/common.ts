import { catalogue } from "./catalogue";

/**
 * The vocabulary every module shares: the buttons on a modal footer, the
 * failure sentences a form shows, the column headings that mean the same
 * thing in stock as in ventes.
 *
 * Worth its own namespace because "Annuler" appeared 22 times and "Fermer" 12
 * across the module files — translated once here, they are translated
 * everywhere, and they cannot drift into two different Arabic words for the
 * same button.
 */
export const common = catalogue({
  // ----------------------------------------------------------- actions
  "action.save": { fr: "Enregistrer", ar: "حفظ" },
  "action.saving": { fr: "Enregistrement…", ar: "جارٍ الحفظ…" },
  "action.cancel": { fr: "Annuler", ar: "إلغاء" },
  "action.close": { fr: "Fermer", ar: "إغلاق" },
  "action.edit": { fr: "Modifier", ar: "تعديل" },
  "action.delete": { fr: "Supprimer", ar: "حذف" },
  "action.add": { fr: "Ajouter", ar: "إضافة" },
  "action.create": { fr: "Créer", ar: "إنشاء" },
  "action.confirm": { fr: "Confirmer", ar: "تأكيد" },
  "action.archive": { fr: "Archiver", ar: "أرشفة" },
  "action.unarchive": { fr: "Désarchiver", ar: "إلغاء الأرشفة" },
  "action.reset": { fr: "Réinitialiser", ar: "إعادة تعيين" },
  "action.search": { fr: "Rechercher", ar: "بحث" },
  "action.export": { fr: "Exporter", ar: "تصدير" },
  "action.print": { fr: "Imprimer", ar: "طباعة" },
  "action.details": { fr: "Détails", ar: "التفاصيل" },
  "action.back": { fr: "Retour", ar: "رجوع" },
  "action.showArchived": { fr: "Afficher les archivés", ar: "إظهار المؤرشفة" },
  "action.remove": { fr: "Retirer", ar: "إزالة" },

  // ----------------------------------------------------------- state
  "state.loading": { fr: "Chargement…", ar: "جارٍ التحميل…" },
  "state.loadingDetail": { fr: "Chargement du détail…", ar: "جارٍ تحميل التفاصيل…" },
  "state.all": { fr: "Tous", ar: "الكل", dev: "masculine plural filter option" },
  "state.allFeminine": { fr: "Toutes", ar: "الكل", dev: "feminine plural filter option" },
  "state.none": { fr: "Aucun", ar: "لا شيء" },
  "state.archived": { fr: "Archivé", ar: "مؤرشف" },
  "state.active": { fr: "Actif", ar: "نشط" },
  "state.yes": { fr: "Oui", ar: "نعم" },
  "state.no": { fr: "Non", ar: "لا" },
  "state.optional": { fr: "Optionnel", ar: "اختياري" },

  // ----------------------------------------------------------- errors
  "error.generic": { fr: "Une erreur est survenue.", ar: "حدث خطأ." },
  "error.save": { fr: "Enregistrement impossible.", ar: "تعذّر الحفظ." },
  "error.action": { fr: "Action impossible.", ar: "تعذّر تنفيذ العملية." },
  "error.delete": { fr: "Suppression impossible.", ar: "تعذّر الحذف." },
  "error.load": { fr: "Chargement impossible.", ar: "تعذّر التحميل." },
  "error.loadDetail": { fr: "Impossible de charger le détail.", ar: "تعذّر تحميل التفاصيل." },
  "error.required": { fr: "Ce champ est obligatoire.", ar: "هذا الحقل إلزامي." },

  // ----------------------------------------------------------- fields
  "field.name": { fr: "Nom", ar: "الاسم" },
  "field.fullName": { fr: "Nom complet", ar: "الاسم الكامل" },
  "field.reference": { fr: "Référence", ar: "المرجع" },
  "field.date": { fr: "Date", ar: "التاريخ" },
  "field.from": { fr: "Du", ar: "من" },
  "field.to": { fr: "Au", ar: "إلى" },
  "field.status": { fr: "Statut", ar: "الحالة" },
  "field.quantity": { fr: "Quantité", ar: "الكمية" },
  "field.unit": { fr: "Unité", ar: "الوحدة" },
  "field.unitCost": { fr: "Coût unitaire", ar: "تكلفة الوحدة" },
  "field.unitPrice": { fr: "Prix unitaire", ar: "سعر الوحدة" },
  "field.salePrice": { fr: "Prix de vente", ar: "سعر البيع" },
  "field.total": { fr: "Total", ar: "المجموع" },
  "field.value": { fr: "Valeur", ar: "القيمة" },
  "field.phone": { fr: "Téléphone", ar: "الهاتف" },
  "field.email": { fr: "E-mail", ar: "البريد الإلكتروني" },
  "field.address": { fr: "Adresse", ar: "العنوان" },
  "field.city": { fr: "Ville", ar: "المدينة" },
  "field.notes": { fr: "Notes", ar: "ملاحظات" },
  "field.reason": { fr: "Raison", ar: "السبب" },
  "field.supplier": { fr: "Fournisseur", ar: "المورّد" },
  "field.customer": { fr: "Client", ar: "الزبون" },
  "field.item": { fr: "Article", ar: "المادة" },
  "field.employee": { fr: "Employé", ar: "الموظف" },
  "field.machine": { fr: "Machine", ar: "الآلة" },
  "field.batch": { fr: "Lot", ar: "الدفعة" },
  "field.batchNumber": { fr: "N° lot", ar: "رقم الدفعة" },
  "field.expiryDate": { fr: "Date de péremption", ar: "تاريخ الصلاحية" },
  "field.payment": { fr: "Paiement", ar: "الدفع" },
  "field.detail": { fr: "Détail", ar: "التفصيل" },
  "field.number": { fr: "N°", ar: "رقم" },
  "field.type": { fr: "Type", ar: "النوع" },
  "field.description": { fr: "Description", ar: "الوصف" },
  "field.photo": { fr: "Photo", ar: "صورة" },
  "field.actions": { fr: "Actions", ar: "إجراءات" },
  "field.nif": { fr: "NIF", ar: "الرقم الجبائي (NIF)" },
  "field.nifHint": { fr: "Numéro d'identification fiscale", ar: "رقم التعريف الجبائي" },
  "field.rc": { fr: "RC", ar: "السجل التجاري (RC)" },
  "field.rcHint": { fr: "Registre de commerce", ar: "رقم السجل التجاري" },
  "field.ai": { fr: "AI", ar: "المادة الضريبية (AI)" },
  "field.aiHint": { fr: "Article d'imposition", ar: "رقم المادة الضريبية" },
  "field.nis": { fr: "NIS", ar: "الرقم الإحصائي (NIS)" },
  "field.nisHint": { fr: "Numéro d'identification statistique", ar: "الرقم الإحصائي للتعريف" },
  "field.choosePhoto": { fr: "Choisir une image", ar: "اختيار صورة" },
  "field.changePhoto": { fr: "Changer l'image", ar: "تغيير الصورة" },
  "field.removePhoto": { fr: "Retirer", ar: "إزالة" },
  "field.photoInvalidType": { fr: "Ce fichier n'est pas une image.", ar: "هذا الملف ليس صورة." },
  "field.photoTooLarge": { fr: "Image trop volumineuse (max 3 Mo).", ar: "الصورة كبيرة جدًا (الحد الأقصى 3 ميغا)." },
  "field.chooseFile": { fr: "Choisir un fichier", ar: "اختيار ملف" },
  "field.changeFile": { fr: "Changer le fichier", ar: "تغيير الملف" },
  "field.removeFile": { fr: "Retirer", ar: "إزالة" },
  "field.fileTooLarge": { fr: "Fichier trop volumineux (max 8 Mo).", ar: "الملف كبير جدًا (الحد الأقصى 8 ميغا)." },

  // ----------------------------------------------------------- units of time
  "unit.hours": { fr: "h", ar: "سا" },
  "unit.days": { fr: "j", ar: "ي" },
  "time.day": { fr: "jour", ar: "يوم" },
  "time.days": { fr: "jours", ar: "أيام" },
  "time.month": { fr: "mois", ar: "شهر" },
  "time.year": { fr: "an", ar: "سنة" },
  "time.years": { fr: "ans", ar: "سنوات" },
  "time.today": { fr: "Aujourd'hui", ar: "اليوم" },
});
