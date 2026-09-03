import { catalogue } from "./catalogue";

/**
 * Achats & fournisseurs: the purchase-order lifecycle
 * (fournisseur → bon de commande → réception → stock) and the supplier file.
 *
 * Vocabulary note: « bon de commande » is the *supplier-side* document —
 * سند طلب. A customer's order is « commande » and lives in sales.ts as طلب.
 * « Réception » here is the delivery event that actually moves stock; the
 * paperwork accompanying it is the « bon de livraison » (سند التسليم).
 */
export const purchasing = catalogue({
  // ------------------------------------------------------------------- page
  "po.loadFailed": { fr: "Impossible de charger les achats.", ar: "تعذّر تحميل المشتريات." },
  "po.tabOrders": { fr: "Bons de commande", ar: "سندات الطلب" },
  "po.tabSuppliers": { fr: "Fournisseurs", ar: "الموردون" },
  "po.new": { fr: "+ Nouveau bon de commande", ar: "+ سند طلب جديد" },
  "po.newSupplier": { fr: "+ Nouveau fournisseur", ar: "+ مورّد جديد" },
  "po.supplierFirst": {
    fr: "Ajoutez d'abord un fournisseur dans l'onglet Fournisseurs.",
    ar: "أضف مورّدًا أولًا في تبويب الموردين.",
  },
  "po.loadingOrders": { fr: "Chargement des achats…", ar: "جارٍ تحميل المشتريات…" },
  "po.loadingSuppliers": { fr: "Chargement des fournisseurs…", ar: "جارٍ تحميل الموردين…" },
  "po.none": { fr: "Aucun bon de commande", ar: "لا توجد سندات طلب" },
  "po.noMatch": { fr: "Aucun bon de commande ne correspond", ar: "لا يوجد سند طلب مطابق" },
  "po.createFirst": {
    fr: "Créez un bon de commande pour suivre vos achats.",
    ar: "أنشئ سند طلب لمتابعة مشترياتك.",
  },
  "po.widenPeriod": {
    fr: "Élargissez la période ou réinitialisez les filtres.",
    ar: "وسّع الفترة أو أعد تعيين المرشّحات.",
  },
  "po.noSuppliers": { fr: "Aucun fournisseur enregistré", ar: "لا يوجد مورّد مسجّل" },
  "po.noSupplierMatch": { fr: "Aucun fournisseur ne correspond à la recherche", ar: "لا يوجد مورّد مطابق للبحث" },
  "po.addSuppliersDesc": {
    fr: "Ajoutez vos fournisseurs de matières premières et de pièces détachées.",
    ar: "أضف موردي المواد الأولية وقطع الغيار.",
  },
  "po.searchSupplier": { fr: "Rechercher un fournisseur…", ar: "البحث عن مورّد…" },

  // ------------------------------------------------------------------- KPIs
  "po.kpi.total": { fr: "Total achats", ar: "إجمالي المشتريات" },
  "po.kpi.totalHint": { fr: "Hors bons annulés", ar: "دون السندات الملغاة" },
  "po.kpi.inProgress": { fr: "En cours", ar: "قيد التنفيذ" },
  "po.kpi.inProgressHint": { fr: "Ni reçus ni annulés", ar: "لا مستلَمة ولا ملغاة" },
  "po.kpi.ordered": { fr: "Commandé, pas encore livré", ar: "مطلوب ولم يُسلَّم بعد" },
  "po.kpi.orderedHint": { fr: "Sur la période filtrée", ar: "على الفترة المرشَّحة" },
  "po.kpi.due": { fr: "Montant dû", ar: "المبلغ المستحق" },
  "po.kpi.dueHint": { fr: "Restant à payer aux fournisseurs", ar: "الباقي دفعه للموردين" },
  "po.late": { fr: "⚠ en retard", ar: "⚠ متأخّر" },

  // ---------------------------------------------------------------- columns
  "po.col.lines": { fr: "Lignes", ar: "السطور" },
  "po.col.expected": { fr: "Livraison prévue", ar: "التسليم المتوقّع" },
  "po.col.contact": { fr: "Contact", ar: "جهة الاتصال" },

  // ---------------------------------------------------------------- statuses
  "poStatus.DRAFT": { fr: "Brouillon", ar: "مسوّدة" },
  "poStatus.SUBMITTED": { fr: "Envoyé", ar: "مُرسَل" },
  "poStatus.APPROVED": { fr: "Approuvé", ar: "معتمَد" },
  "poStatus.PARTIALLY_RECEIVED": { fr: "Partiellement reçu", ar: "مستلَم جزئيًا" },
  "poStatus.RECEIVED": { fr: "Reçu", ar: "مستلَم" },
  "poStatus.CANCELLED": { fr: "Annulé", ar: "ملغى" },
  "poPayment.PENDING": { fr: "En attente", ar: "قيد الانتظار" },
  "poPayment.PARTIAL": { fr: "Partiellement payé", ar: "مدفوع جزئيًا" },
  "poPayment.PAID": { fr: "Payé", ar: "مدفوع" },
  "poPayment.CANCELLED": { fr: "Annulé", ar: "ملغى" },

  // ------------------------------------------------------------- order form
  "po.newTitle": { fr: "Nouveau bon de commande", ar: "سند طلب جديد" },
  "po.editTitle": { fr: "Modifier {code}", ar: "تعديل {code}" },
  "po.expectedDelivery": { fr: "Livraison prévue", ar: "التسليم المتوقّع" },
  "po.orderedItems": { fr: "Articles commandés", ar: "المواد المطلوبة" },
  "po.choose": { fr: "— Choisir —", ar: "— اختر —" },
  "po.addLine": { fr: "+ Ajouter une ligne", ar: "+ إضافة سطر" },
  "po.unitCostLabel": { fr: "Prix unitaire (DZD)", ar: "سعر الوحدة (دج)" },
  "po.quantityWithUnit": { fr: "Quantité ({unit})", ar: "الكمية ({unit})" },
  "po.quantity": { fr: "Quantité", ar: "الكمية" },
  "po.freight": { fr: "Transport (DZD)", ar: "النقل (دج)" },
  "po.taxLabel": { fr: "Taxe (%)", ar: "الرسم (%)" },
  "po.rateOnlyHint": {
    fr: "Le taux seulement — le montant en DZD est calculé automatiquement",
    ar: "النسبة فقط — يُحسب المبلغ بالدينار تلقائيًا",
  },
  "po.deposit": { fr: "Paiement initial (DZD)", ar: "الدفعة الأولى (دج)" },
  "po.depositHint": {
    fr: "Facultatif — un acompte versé au fournisseur, par ex. la moitié maintenant",
    ar: "اختياري — عربون يُدفع للمورّد، مثلًا النصف الآن",
  },
  "po.err.supplier": { fr: "Choisissez un fournisseur.", ar: "اختر مورّدًا." },
  "po.err.lines": {
    fr: "Ajoutez au moins une ligne avec une quantité.",
    ar: "أضف سطرًا واحدًا على الأقل بكمية.",
  },
  "po.err.lineQuantity": { fr: "Indiquez une quantité pour « {item} ».", ar: "أدخل كمية لـ«{item}»." },
  "po.err.deposit": {
    fr: "Le paiement initial ({paid}) dépasse le total du bon de commande ({total}).",
    ar: "الدفعة الأولى ({paid}) تتجاوز مجموع سند الطلب ({total}).",
  },
  "po.savingMovesNothing": {
    fr: "Enregistrer ce bon ne touche pas au stock. Le stock n'augmente qu'à la réception de la marchandise, depuis la fiche du bon.",
    ar: "حفظ هذا السند لا يمسّ المخزون. لا يزيد المخزون إلا عند استلام البضاعة، من بطاقة السند.",
  },
  "po.ph.discountPercent": { fr: "Ex. 10", ar: "مثال: 10" },
  "po.ph.taxPercent": { fr: "Ex. 19", ar: "مثال: 19" },

  // ----------------------------------------------------------- order detail
  "po.label": { fr: "Bon de commande", ar: "سند طلب" },
  "po.changeStatus": { fr: "Changer le statut", ar: "تغيير الحالة" },
  "po.mustApprove": {
    fr: "Ce bon doit être approuvé avant de pouvoir enregistrer une réception.",
    ar: "يجب اعتماد هذا السند قبل التمكّن من تسجيل استلام.",
  },
  "po.receipts": { fr: "Réceptions", ar: "الاستلامات" },
  "po.noReceipts": { fr: "Aucune réception enregistrée.", ar: "لم يُسجَّل أي استلام." },
  "po.addReceipt": { fr: "+ Enregistrer une réception", ar: "+ تسجيل استلام" },
  "po.saveReceipt": { fr: "Enregistrer la réception", ar: "حفظ الاستلام" },
  "po.receiptDate": { fr: "Date de réception", ar: "تاريخ الاستلام" },
  "po.deliveryNote": { fr: "Bon de livraison", ar: "سند التسليم" },
  "po.deliveryNoteHint": { fr: "Numéro du fournisseur, facultatif", ar: "رقم المورّد، اختياري" },
  "po.receiptIncreasesStock": {
    fr: "Enregistrer cette réception augmentera le stock immédiatement.",
    ar: "تسجيل هذا الاستلام سيزيد المخزون فورًا.",
  },
  "po.receivedQtyLabel": { fr: "Quantité reçue ({unit})", ar: "الكمية المستلَمة ({unit})" },
  "po.err.receiptLines": {
    fr: "Indiquez la quantité reçue pour au moins une ligne.",
    ar: "أدخل الكمية المستلَمة لسطر واحد على الأقل.",
  },
  "po.acceptOverDelivery": { fr: "Accepter une sur-livraison", ar: "قبول تسليم زائد" },
  "po.overDeliveryHint": {
    fr: "À cocher seulement si le fournisseur a réellement livré plus que commandé — sinon c'est probablement une faute de frappe.",
    ar: "أشِّر عليه فقط إذا سلّم المورّد فعلًا أكثر مما طُلب — وإلا فالأرجح أنه خطأ مطبعي.",
  },
  "po.requiredForProduct": { fr: "Obligatoire pour ce produit", ar: "إلزامي لهذا المنتج" },
  "po.col.orderedQty": { fr: "Commandé", ar: "المطلوب" },
  "po.col.receivedQty": { fr: "Reçu", ar: "المستلَم" },
  "po.col.remainingQty": { fr: "Reste", ar: "الباقي" },
  "po.col.lineTotal": { fr: "Total ligne", ar: "مجموع السطر" },
  "po.savePayment": { fr: "Enregistrer le paiement", ar: "حفظ الدفعة" },
  "po.addPayment": { fr: "+ Enregistrer un paiement", ar: "+ تسجيل دفعة" },
  "po.amountPaidLabel": { fr: "Montant payé (DZD)", ar: "المبلغ المدفوع (دج)" },
  "po.balanceHint": { fr: "Solde restant dû : {balance}", ar: "الرصيد الباقي المستحق: {balance}" },
  "po.paymentDate": { fr: "Date du paiement", ar: "تاريخ الدفع" },
  "po.paidLabel": { fr: "Payé :", ar: "المدفوع:" },
  "po.err.paymentAmount": {
    fr: "Indiquez un montant de paiement supérieur à zéro.",
    ar: "أدخل مبلغ دفع أكبر من الصفر.",
  },

  // ---------------------------------------------------------- supplier form
  "supplier.newTitle": { fr: "Nouveau fournisseur", ar: "مورّد جديد" },
  "supplier.editTitle": { fr: "Modifier {name}", ar: "تعديل {name}" },
  "supplier.add": { fr: "Ajouter le fournisseur", ar: "إضافة المورّد" },
  "supplier.contactPerson": { fr: "Personne à contacter", ar: "الشخص المعني بالاتصال" },
  "supplier.err.name": { fr: "Le nom est obligatoire.", ar: "الاسم إلزامي." },
  "supplier.notesHint": { fr: "Registre de commerce, NIF, NIS…", ar: "السجل التجاري، NIF، NIS…" },

  // --------------------------------------------------------- supplier fiche
  "supplier.loadFailed": { fr: "Impossible de charger la fiche fournisseur.", ar: "تعذّر تحميل بطاقة المورّد." },
  "supplier.totalPurchased": { fr: "Total acheté", ar: "إجمالي المشتريات" },
  "supplier.due": { fr: "Montant dû", ar: "المبلغ المستحق" },
  "supplier.dueHint": { fr: "Restant à payer à ce fournisseur", ar: "الباقي دفعه لهذا المورّد" },
  "supplier.lastPurchase": { fr: "Dernier achat", ar: "آخر شراء" },
  "supplier.createdOn": { fr: "Créé le", ar: "أُنشئ في" },
  "supplier.materials": { fr: "Matières fournies", ar: "المواد المورَّدة" },
  "supplier.noMaterials": { fr: "Aucune matière connue", ar: "لا توجد مواد معروفة" },
  "supplier.materialsAppear": {
    fr: "Les matières apparaissent ici dès qu'un bon de commande ou une réception les mentionne.",
    ar: "تظهر المواد هنا بمجرّد أن يذكرها سند طلب أو استلام.",
  },
  "supplier.lastCost": { fr: "Dernier coût", ar: "آخر تكلفة" },
  "supplier.lastTime": { fr: "Dernière fois", ar: "آخر مرّة" },
  "supplier.receiptsOnOrders": { fr: "Réceptions sur bons de commande", ar: "الاستلامات على سندات الطلب" },
  "supplier.noReceiptsOnOrders": {
    fr: "Aucune réception enregistrée sur un bon de commande.",
    ar: "لم يُسجَّل أي استلام على سند طلب.",
  },
  "supplier.allEntries": { fr: "Historique complet des entrées", ar: "السجلّ الكامل للمدخلات" },
  "supplier.allEntriesHint": {
    fr: "Toutes les entrées de stock attribuées à ce fournisseur, y compris celles saisies directement dans l'onglet Stock.",
    ar: "كل مدخلات المخزون المنسوبة لهذا المورّد، بما فيها المُدخلة مباشرة في تبويب المخزون.",
  },
  "supplier.noEntries": { fr: "Aucune entrée de stock.", ar: "لا توجد مدخلات مخزون." },

  "po.tabPurchases": { fr: "Achats", ar: "المشتريات" },
  "po.commitments": { fr: "Engagements", ar: "الالتزامات" },
  "po.lateSuffix": { fr: " · en retard", ar: " · متأخّر" },

  "po.itemWithReference": { fr: "{name} ({reference})", ar: "{name} ({reference})" },
  "po.freightRow": { fr: "Transport", ar: "النقل" },
  "supplier.registration": { fr: "Immatriculation", ar: "التسجيل" },

  "supplier.openOrders": { fr: "{count} en cours", ar: "{count} قيد التنفيذ" },
  "supplier.tabInfo": { fr: "Informations", ar: "المعلومات" },

  "po.modalTitle": { fr: "Bon de commande {code}", ar: "سند الطلب {code}" },
  "po.confirmDeleteDraft": { fr: "Supprimer le brouillon {code} ?", ar: "حذف المسوّدة {code}؟" },
  "po.contactLine": { fr: "Contact : {name}", ar: "جهة الاتصال: {name}" },
  "po.paidOf": { fr: "Payé : {paid} sur {total}", ar: "المدفوع: {paid} من {total}" },
  "po.balanceDue": { fr: " — solde restant dû : {balance}", ar: " — الرصيد الباقي المستحق: {balance}" },
  "po.remainingQty": { fr: "{quantity} {unit} restant(s)", ar: "{quantity} {unit} متبقّية" },
});
