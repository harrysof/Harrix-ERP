import { catalogue } from "./catalogue";

/**
 * Ventes & clients: the order list, the invoice, returns, payments and the
 * customer file.
 *
 * Vocabulary notes for the next translator:
 *   - « commande » is a *customer* order (طلب زبون). The supplier-side
 *     document is « bon de commande » and lives in purchasing.ts as سند طلب.
 *   - « remise » is a commercial discount (تخفيض), never a delivery.
 *   - « expédition » is the act of shipping stock out, which is what actually
 *     moves the ledger — hence إرسال rather than the vaguer شحن.
 */
export const sales = catalogue({
  // ------------------------------------------------------------------- page
  "sales.loadFailed": { fr: "Impossible de charger les ventes.", ar: "تعذّر تحميل المبيعات." },
  "sales.tabOrders": { fr: "Commandes", ar: "الطلبات" },
  "sales.tabCustomers": { fr: "Clients", ar: "الزبائن" },
  "sales.newOrder": { fr: "+ Nouvelle commande", ar: "+ طلب جديد" },
  "sales.newCustomer": { fr: "+ Nouveau client", ar: "+ زبون جديد" },
  "sales.customerFirst": {
    fr: "Créez d'abord un client — une commande doit être rattachée à quelqu'un.",
    ar: "أنشئ زبونًا أولًا — يجب أن يرتبط كل طلب بشخص.",
  },

  // ------------------------------------------------------------------- KPIs
  "sales.kpi.orders": { fr: "Commandes", ar: "الطلبات" },
  "sales.kpi.pending": { fr: "{count} en attente", ar: "{count} قيد الانتظار" },
  "sales.kpi.shipped": { fr: "Expédiées", ar: "المُرسَلة" },
  "sales.kpi.revenue": { fr: "Chiffre d'affaires", ar: "رقم الأعمال" },
  "sales.kpi.revenueHint": { fr: "Commandes payées uniquement", ar: "الطلبات المدفوعة فقط" },
  "sales.kpi.outstanding": { fr: "Impayé", ar: "غير مدفوع" },
  "sales.kpi.outstandingHint": { fr: "Commandes non réglées", ar: "طلبات لم تُسدَّد" },

  // ---------------------------------------------------------------- filters
  "sales.search": { fr: "Recherche", ar: "البحث" },
  "sales.searchHint": { fr: "N° de commande, nom ou email", ar: "رقم الطلب، الاسم أو البريد" },
  "sales.searchPlaceholder": { fr: "CMD-2026-… ", ar: "CMD-2026-… " },
  "sales.shipment": { fr: "Expédition", ar: "الإرسال" },
  "sales.showArchivedOrders": { fr: "Afficher les commandes archivées", ar: "إظهار الطلبات المؤرشفة" },
  "sales.showArchivedCustomers": { fr: "Afficher les clients archivés", ar: "إظهار الزبائن المؤرشفين" },
  "sales.loadingOrders": { fr: "Chargement des commandes…", ar: "جارٍ تحميل الطلبات…" },
  "sales.loadingCustomers": { fr: "Chargement des clients…", ar: "جارٍ تحميل الزبائن…" },
  "sales.noOrderMatch": { fr: "Aucune commande ne correspond", ar: "لا يوجد طلب مطابق" },
  "sales.noOrders": { fr: "Aucune commande", ar: "لا توجد طلبات" },
  "sales.widenSearch": {
    fr: "Élargissez la recherche ou réinitialisez les filtres.",
    ar: "وسّع البحث أو أعد تعيين المرشّحات.",
  },
  "sales.noCustomers": { fr: "Aucun client", ar: "لا يوجد زبائن" },
  "sales.noCustomersDesc": {
    fr: "Ajoutez vos clients pour pouvoir créer des commandes.",
    ar: "أضف زبائنك لتتمكّن من إنشاء الطلبات.",
  },

  // ---------------------------------------------------------------- columns
  "sales.col.orderNumber": { fr: "N° commande", ar: "رقم الطلب" },
  "sales.col.orders": { fr: "Commandes", ar: "الطلبات" },
  "sales.col.totalPurchased": { fr: "Total acheté", ar: "إجمالي المشتريات" },
  "sales.col.balanceDue": { fr: "Solde dû", ar: "الرصيد المستحق" },
  "sales.col.createdOn": { fr: "Créé le", ar: "أُنشئ في" },
  "sales.stockWarning": {
    fr: "Stock insuffisant pour expédier maintenant",
    ar: "المخزون غير كافٍ للإرسال الآن",
  },
  "sales.view": { fr: "Voir", ar: "عرض" },
  "sales.file": { fr: "Fiche", ar: "البطاقة" },

  // ---------------------------------------------------------------- statuses
  "shipment.PENDING": { fr: "En attente", ar: "قيد الانتظار" },
  "shipment.SHIPPED": { fr: "Expédié", ar: "مُرسَل" },
  "shipment.CANCELLED": { fr: "Annulé", ar: "ملغى" },
  "payment.PENDING": { fr: "En attente", ar: "قيد الانتظار" },
  "payment.PARTIAL": { fr: "Partiellement payé", ar: "مدفوع جزئيًا" },
  "payment.PAID": { fr: "Payé", ar: "مدفوع" },
  "payment.CANCELLED": { fr: "Annulé", ar: "ملغى" },

  // ---------------------------------------------------------------- totals
  "totals.subtotal": { fr: "Sous-total", ar: "المجموع الفرعي" },
  "totals.lineDiscounts": { fr: "dont remises par ligne", ar: "منها تخفيضات بالسطر" },
  "totals.shipping": { fr: "Livraison", ar: "التوصيل" },
  "totals.discount": { fr: "Remise", ar: "التخفيض" },
  "totals.discountPercent": { fr: "Remise ({rate})", ar: "التخفيض ({rate})" },
  "totals.tax": { fr: "Taxe", ar: "الرسم" },
  "totals.taxPercent": { fr: "Taxe ({rate})", ar: "الرسم ({rate})" },
  "totals.total": { fr: "Total", ar: "المجموع" },

  // ---------------------------------------------------------- customer form
  "customer.newTitle": { fr: "Nouveau client", ar: "زبون جديد" },
  "customer.editTitle": { fr: "Modifier {name}", ar: "تعديل {name}" },
  "customer.err.fullName": { fr: "Le nom complet est obligatoire.", ar: "الاسم الكامل إلزامي." },
  "customer.province": { fr: "Wilaya / province", ar: "الولاية" },
  "customer.postalCode": { fr: "Code postal", ar: "الرمز البريدي" },
  "customer.country": { fr: "Pays", ar: "البلد" },
  "customer.defaultCountry": { fr: "Algérie", ar: "الجزائر" },
  "customer.photoLabel": { fr: "Logo / photo", ar: "الشعار / الصورة" },

  // -------------------------------------------------------- customer fiche
  "customer.orderCount": { fr: "Commandes", ar: "الطلبات" },
  "customer.totalPurchased": { fr: "Total acheté", ar: "إجمالي المشتريات" },
  "customer.outstanding": { fr: "Solde dû", ar: "الرصيد المستحق" },
  "customer.contact": { fr: "Coordonnées", ar: "بيانات الاتصال" },
  "customer.shippingAddress": { fr: "Adresse de livraison", ar: "عنوان التسليم" },
  "customer.orderHistory": { fr: "Historique des commandes", ar: "سجلّ الطلبات" },
  "customer.noOrders": { fr: "Aucune commande pour ce client.", ar: "لا توجد طلبات لهذا الزبون." },

  // ------------------------------------------------------------- order form
  "order.newTitle": { fr: "Nouvelle commande", ar: "طلب جديد" },
  "order.editTitle": { fr: "Modifier {code}", ar: "تعديل {code}" },
  "order.customer": { fr: "Client", ar: "الزبون" },
  "order.date": { fr: "Date de commande", ar: "تاريخ الطلب" },
  "order.lines": { fr: "Lignes de commande", ar: "سطور الطلب" },
  "order.addLine": { fr: "+ Ajouter une ligne", ar: "+ إضافة سطر" },
  "order.product": { fr: "Produit", ar: "المنتج" },
  "order.lineDiscount": { fr: "Remise", ar: "تخفيض" },
  "order.chooseProduct": { fr: "— Choisir un produit —", ar: "— اختر منتجًا —" },
  "order.chooseCustomer": { fr: "— Choisir un client —", ar: "— اختر زبونًا —" },
  "order.adjustments": { fr: "Ajustements", ar: "التعديلات" },
  "order.shippingCost": { fr: "Frais de livraison (DZD)", ar: "مصاريف التوصيل (دج)" },
  "order.discountType": { fr: "Type de remise", ar: "نوع التخفيض" },
  "order.discountFixed": { fr: "Montant fixe (DZD)", ar: "مبلغ ثابت (دج)" },
  "order.discountPercent": { fr: "Pourcentage (%)", ar: "نسبة مئوية (%)" },
  "order.taxRate": { fr: "Taux de taxe (%)", ar: "نسبة الرسم (%)" },
  "order.err.customer": { fr: "Choisissez un client.", ar: "اختر زبونًا." },
  "order.err.lines": {
    fr: "Ajoutez au moins une ligne avec un produit et une quantité.",
    ar: "أضف سطرًا واحدًا على الأقل بمنتج وكمية.",
  },
  "order.stockShort": {
    fr: "Stock insuffisant : {item} — {available} disponible, {needed} demandé.",
    ar: "المخزون غير كافٍ: {item} — {available} متاح، {needed} مطلوب.",
  },

  // ----------------------------------------------------------- order detail
  "order.invoice": { fr: "Bon de commande", ar: "سند الطلب" },
  "order.orderedOn": { fr: "Commande du {date}", ar: "طلب بتاريخ {date}" },
  "order.billTo": { fr: "Facturé à", ar: "فُوتِر إلى" },
  "order.shipTo": { fr: "Livré à", ar: "سُلِّم إلى" },
  "order.ship": { fr: "Expédier", ar: "إرسال" },
  "order.shipping": { fr: "Expédition…", ar: "جارٍ الإرسال…" },
  "order.cancel": { fr: "Annuler la commande", ar: "إلغاء الطلب" },
  "order.recordPayment": { fr: "Enregistrer un paiement", ar: "تسجيل دفعة" },
  "order.recordReturn": { fr: "Enregistrer un retour", ar: "تسجيل إرجاع" },
  "order.paidSoFar": { fr: "Déjà payé", ar: "المدفوع سابقًا" },
  "order.amountDue": { fr: "Reste à payer", ar: "الباقي للدفع" },
  "order.paymentAmount": { fr: "Montant encaissé (DZD)", ar: "المبلغ المحصَّل (دج)" },
  "order.returns": { fr: "Retours", ar: "الإرجاعات" },
  "order.noReturns": { fr: "Aucun retour sur cette commande.", ar: "لا توجد إرجاعات على هذا الطلب." },
  "order.returnQuantity": { fr: "Quantité retournée", ar: "الكمية المرجَعة" },
  "order.returnable": { fr: "{quantity} retournable", ar: "{quantity} قابلة للإرجاع" },
  "order.returnReason": { fr: "Motif du retour", ar: "سبب الإرجاع" },
  "order.confirmCancel": {
    fr: "Annuler la commande {code} ? Cette action est définitive.",
    ar: "إلغاء الطلب {code}؟ هذا الإجراء نهائي.",
  },
  "order.confirmShip": {
    fr: "Expédier {code} ? Le stock sortira de l'inventaire et l'opération ne peut pas être défaite.",
    ar: "إرسال {code}؟ سيخرج المخزون من الجرد ولا يمكن التراجع عن العملية.",
  },
  "order.shippedOn": { fr: "Expédié le {date}", ar: "أُرسل في {date}" },

  // -------------------------------------------------------- order form extras
  "order.err.products": {
    fr: "Ajoutez au moins un produit avec une quantité.",
    ar: "أضف منتجًا واحدًا على الأقل بكمية.",
  },
  "order.err.deposit": {
    fr: "Le paiement initial ({paid}) dépasse le total de la commande ({total}).",
    ar: "الدفعة الأولى ({paid}) تتجاوز مجموع الطلب ({total}).",
  },
  "order.customerFirstHint": { fr: "Créez d'abord un client", ar: "أنشئ زبونًا أولًا" },
  "order.choose": { fr: "— Choisir —", ar: "— اختر —" },
  "order.deposit": { fr: "Paiement initial (DZD)", ar: "الدفعة الأولى (دج)" },
  "order.depositHint": {
    fr: "Facultatif — un acompte payé à la commande, par ex. la moitié maintenant",
    ar: "اختياري — عربون يُدفع عند الطلب، مثلًا النصف الآن",
  },
  "order.products": { fr: "Produits", ar: "المنتجات" },
  "order.productInStock": { fr: "{name} ({quantity} en stock)", ar: "{name} ({quantity} في المخزون)" },
  "order.qtyWithUnit": { fr: "Qté ({unit})", ar: "الكمية ({unit})" },
  "order.qty": { fr: "Qté", ar: "الكمية" },
  "order.lineDiscountLabel": { fr: "Remise ligne", ar: "تخفيض السطر" },
  "order.addProduct": { fr: "+ Ajouter un produit", ar: "+ إضافة منتج" },
  "order.shippingLabel": { fr: "Livraison (DZD)", ar: "التوصيل (دج)" },
  "order.globalDiscount": { fr: "Remise globale", ar: "تخفيض إجمالي" },
  "order.rateOnlyHint": {
    fr: "Le taux seulement — le montant en DZD est calculé automatiquement",
    ar: "النسبة فقط — يُحسب المبلغ بالدينار تلقائيًا",
  },
  "order.taxLabel": { fr: "Taxe (%)", ar: "الرسم (%)" },
  "order.ph.discountPercent": { fr: "Ex. 10", ar: "مثال: 10" },
  "order.ph.taxPercent": { fr: "Ex. 19", ar: "مثال: 19" },
  "order.savingMovesNothing": {
    fr: "Enregistrer une commande ne sort rien du stock. Le stock ne diminue qu'à l'expédition, depuis la fiche de la commande.",
    ar: "حفظ الطلب لا يُخرج شيئًا من المخزون. لا ينقص المخزون إلا عند الإرسال، من بطاقة الطلب.",
  },

  // ------------------------------------------------------- customer fiche
  "customer.loadFailed": { fr: "Impossible de charger la fiche client.", ar: "تعذّر تحميل بطاقة الزبون." },
  "customer.confirmDelete": {
    fr: "Supprimer définitivement {name} ?",
    ar: "حذف {name} نهائيًا؟",
  },
  "customer.excludingCancelled": { fr: "Hors commandes annulées", ar: "دون الطلبات الملغاة" },
  "customer.unpaidOrders": { fr: "Commandes non payées", ar: "طلبات غير مدفوعة" },
  "customer.since": { fr: "Client depuis", ar: "زبون منذ" },
  "customer.profile": { fr: "Profil", ar: "الملف" },
  "customer.cityLabel": { fr: "Ville", ar: "المدينة" },
  "customer.provinceCountry": { fr: "Wilaya / pays", ar: "الولاية / البلد" },
  "customer.neverOrdered": { fr: "Ce client n'a pas encore commandé.", ar: "لم يطلب هذا الزبون بعد." },

  // ------------------------------------------------------- order detail view
  "order.modalTitle": { fr: "Commande {code}", ar: "الطلب {code}" },
  "order.label": { fr: "Commande", ar: "طلب" },
  "order.archived": { fr: "Archivée", ar: "مؤرشف" },
  "order.shipmentPill": { fr: "Expédition : {status}", ar: "الإرسال: {status}" },
  "order.paymentPill": { fr: "Paiement : {status}", ar: "الدفع: {status}" },
  "order.confirmCancelShort": { fr: "Annuler la commande {code} ?", ar: "إلغاء الطلب {code}؟" },
  "order.confirmDelete": {
    fr: "Supprimer définitivement la commande {code} ?",
    ar: "حذف الطلب {code} نهائيًا؟",
  },
  "order.stockShortBanner": {
    fr: "Stock insuffisant pour expédier cette commande aujourd'hui : {details}. La commande reste valable ; produisez ou réceptionnez la différence avant de l'expédier.",
    ar: "المخزون غير كافٍ لإرسال هذا الطلب اليوم: {details}. يبقى الطلب صالحًا؛ أنتج أو استلم الفرق قبل إرساله.",
  },
  "order.stockShortDetail": {
    fr: "{item} — {available} {unit} en stock, {required} demandé(s)",
    ar: "{item} — {available} {unit} في المخزون، {required} مطلوبة",
  },
  "order.items": { fr: "Articles", ar: "المواد" },
  "order.col.lineTotal": { fr: "Total ligne", ar: "مجموع السطر" },
  "order.noEmail": { fr: "Pas d'email", ar: "بلا بريد إلكتروني" },
  "order.noPhone": { fr: "Pas de téléphone", ar: "بلا هاتف" },
  "order.noAddress": { fr: "Pas d'adresse", ar: "بلا عنوان" },
  "order.delivery": { fr: "Livraison", ar: "التسليم" },
  "order.statusSection": { fr: "Statut", ar: "الحالة" },
  "order.shipDate": { fr: "Date d'expédition", ar: "تاريخ الإرسال" },
  "order.alsoMarkPaid": { fr: "Marquer aussi comme payée", ar: "وضع علامة مدفوع أيضًا" },
  "order.shipWarning": {
    fr: "L'expédition sortira {count} du stock de produits finis. Cette action ne peut pas être annulée.",
    ar: "سيُخرج الإرسال {count} من مخزون المنتجات النهائية. لا يمكن التراجع عن هذا الإجراء.",
  },
  "order.confirmShipButton": { fr: "Confirmer l'expédition", ar: "تأكيد الإرسال" },
  "order.shipButton": { fr: "Expédier la commande", ar: "إرسال الطلب" },
  "order.paidOf": { fr: "Payé : {paid} sur {total}", ar: "المدفوع: {paid} من {total}" },
  "order.balanceDue": { fr: " — solde restant dû : {balance}", ar: " — الرصيد الباقي المستحق: {balance}" },
  "order.amountPaidLabel": { fr: "Montant payé (DZD)", ar: "المبلغ المدفوع (دج)" },
  "order.balanceHint": { fr: "Solde restant dû : {balance}", ar: "الرصيد الباقي المستحق: {balance}" },
  "order.paymentDate": { fr: "Date du paiement", ar: "تاريخ الدفع" },
  "order.savePayment": { fr: "Enregistrer le paiement", ar: "حفظ الدفعة" },
  "order.addPayment": { fr: "+ Enregistrer un paiement", ar: "+ تسجيل دفعة" },
  "order.err.paymentAmount": {
    fr: "Indiquez un montant de paiement supérieur à zéro.",
    ar: "أدخل مبلغ دفع أكبر من الصفر.",
  },
  "order.returnsSection": { fr: "Retours", ar: "الإرجاعات" },
  "order.noReturnsRecorded": { fr: "Aucun retour enregistré.", ar: "لم يُسجَّل أي إرجاع." },
  "order.col.motive": { fr: "Motif", ar: "السبب" },
  "order.returnDate": { fr: "Date du retour", ar: "تاريخ الإرجاع" },
  "order.returnMotiveHint": {
    fr: "Facultatif — ex. « ne convient pas au client »",
    ar: "اختياري — مثلًا «لا يناسب الزبون»",
  },
  "order.returnableQty": { fr: "{quantity} {unit} retournable(s)", ar: "{quantity} {unit} قابلة للإرجاع" },
  "order.returnedQtyLabel": { fr: "Quantité retournée ({unit})", ar: "الكمية المرجَعة ({unit})" },
  "order.returnRestocks": {
    fr: "Enregistrer ce retour remettra les quantités indiquées dans le stock de produits finis.",
    ar: "تسجيل هذا الإرجاع سيعيد الكميات المذكورة إلى مخزون المنتجات النهائية.",
  },
  "order.saveReturn": { fr: "Enregistrer le retour", ar: "حفظ الإرجاع" },
  "order.addReturn": { fr: "+ Enregistrer un retour", ar: "+ تسجيل إرجاع" },
  "order.allReturned": { fr: "Tout a déjà été retourné.", ar: "أُرجع كل شيء بالفعل." },
  "order.err.returnLines": {
    fr: "Indiquez la quantité retournée pour au moins une ligne.",
    ar: "أدخل الكمية المرجَعة لسطر واحد على الأقل.",
  },
  "order.unitCount.one": { fr: "{count} unité", ar: "وحدة واحدة" },
  "order.unitCount.two": { fr: "{count} unités", ar: "وحدتان" },
  "order.unitCount.few": { fr: "{count} unités", ar: "{count} وحدات" },
  "order.unitCount.other": { fr: "{count} unités", ar: "{count} وحدة" },
});
