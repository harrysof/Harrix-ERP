import { catalogue } from "./catalogue";

/**
 * Finance: the margin calculator (what a product costs to make and what it
 * should therefore sell for) and the factory-costs ledger.
 *
 * « Marge » is the gross margin as a share of the sale price — هامش — and
 * « coût de revient » is the full cost price, سعر التكلفة. Keeping those two
 * apart matters: the screen deliberately never claims to know the second one.
 */
export const finance = catalogue({
  // ------------------------------------------------------------------- tabs
  "fin.tabCalculator": { fr: "Calculateur de marge", ar: "حاسبة الهامش" },
  "fin.tabCosts": { fr: "Coûts d'usine", ar: "مصاريف المصنع" },

  // ------------------------------------------------------- margin calculator
  "fin.loadProductsFailed": {
    fr: "Impossible de charger les produits finis.",
    ar: "تعذّر تحميل المنتجات النهائية.",
  },
  "fin.noFinishedGoodsInventory": {
    fr: "Aucun inventaire « Produits finis » n'est configuré",
    ar: "لم يُعدّ أي مخزون «منتجات نهائية»",
  },
  "fin.searchProduct": { fr: "Rechercher un produit fini…", ar: "البحث عن منتج نهائي…" },
  "fin.chooseProduct": { fr: "— Choisir un produit —", ar: "— اختر منتجًا —" },
  "fin.selectToStart": { fr: "Sélectionnez un produit pour commencer", ar: "اختر منتجًا للبدء" },
  "fin.calcAppearsHere": {
    fr: "Le calcul de coût et de marge apparaîtra ici.",
    ar: "سيظهر هنا حساب التكلفة والهامش.",
  },
  "fin.costs": { fr: "Coûts", ar: "التكاليف" },
  "fin.addCost": { fr: "+ Ajouter un coût", ar: "+ إضافة تكلفة" },
  "fin.ph.costLabel": {
    fr: "Ex. matières, main-d'œuvre, énergie…",
    ar: "مثال: مواد، يد عاملة، طاقة…",
  },
  "fin.removeShort": { fr: "Suppr.", ar: "حذف" },
  "fin.totalCost": { fr: "Coût total", ar: "التكلفة الإجمالية" },
  "fin.quantityProduced": { fr: "Quantité produite", ar: "الكمية المنتَجة" },
  "fin.quantityHint": {
    fr: "Le coût total ci-dessus est divisé par cette quantité pour obtenir le coût unitaire",
    ar: "تُقسم التكلفة الإجمالية أعلاه على هذه الكمية للحصول على تكلفة الوحدة",
  },
  "fin.unitCost": { fr: "Coût unitaire", ar: "تكلفة الوحدة" },
  "fin.perUnit": { fr: "Par unité", ar: "للوحدة" },
  "fin.totalCostForQuantity": { fr: "Coût total ÷ quantité", ar: "التكلفة الإجمالية ÷ الكمية" },
  "fin.forQuantity": { fr: "Pour {quantity} unités", ar: "لـ{quantity} وحدة" },
  "fin.targetMargin": { fr: "Marge cible (%)", ar: "الهامش المستهدف (%)" },
  "fin.targetMarginHint": {
    fr: "Sert à calculer le prix suggéré ci-dessous",
    ar: "تُستعمل لحساب السعر المقترح أدناه",
  },
  "fin.suggestedPrice": { fr: "Prix suggéré (marge {margin}%)", ar: "السعر المقترح (هامش {margin}%)" },
  "fin.currentPrice": { fr: "Prix de vente actuel (stock)", ar: "سعر البيع الحالي (المخزون)" },
  "fin.currentPriceHint": {
    fr: "Le prix de vente affiché à droite vient de Stock → Produits finis",
    ar: "سعر البيع المعروض على الجانب مأخوذ من المخزون ← المنتجات النهائية",
  },
  "fin.noPriceSet": { fr: "Aucun prix renseigné sur cet article", ar: "لا يوجد سعر مُدخَل لهذه المادة" },
  "fin.actualMargin": { fr: "Marge réelle actuelle", ar: "الهامش الفعلي الحالي" },
  "fin.addCostForSuggestion": {
    fr: "Ajoutez au moins un coût pour obtenir un prix suggéré et une marge.",
    ar: "أضف تكلفة واحدة على الأقل للحصول على سعر مقترح وهامش.",
  },
  "fin.err.margin": {
    fr: "La marge cible doit être comprise entre 0 et 99 %.",
    ar: "يجب أن يكون الهامش المستهدف بين 0 و99 ٪.",
  },
  "fin.err.quantity": {
    fr: "La quantité produite doit être un nombre positif.",
    ar: "يجب أن تكون الكمية المنتَجة عددًا موجبًا.",
  },

  // ----------------------------------------------------------- factory costs
  "fin.loadCostsFailed": { fr: "Impossible de charger les coûts.", ar: "تعذّر تحميل المصاريف." },
  "fin.addCostTitle": { fr: "Ajouter un coût", ar: "إضافة مصروف" },
  "fin.costType": { fr: "Type de coût", ar: "نوع المصروف" },
  "fin.ph.costType": {
    fr: "Ex. loyer, électricité, salaires indirects…",
    ar: "مثال: إيجار، كهرباء، أجور غير مباشرة…",
  },
  "fin.amount": { fr: "Montant", ar: "المبلغ" },
  "fin.amountDzd": { fr: "Montant (DZD)", ar: "المبلغ (دج)" },
  "fin.addCostButton": { fr: "+ Ajouter le coût", ar: "+ إضافة المصروف" },
  "fin.copyFrom": { fr: "Copier depuis…", ar: "نسخ من…" },
  "fin.copyFailed": { fr: "Copie impossible.", ar: "تعذّر النسخ." },
  "fin.monthTotal": { fr: "Coût total du mois", ar: "إجمالي مصاريف الشهر" },
  "fin.costLines": { fr: "Postes de coûts", ar: "بنود المصاريف" },
  "fin.noCosts": { fr: "Aucun coût enregistré pour ce mois", ar: "لا توجد مصاريف مسجّلة لهذا الشهر" },
  "fin.addFirstCost": { fr: "Ajoutez le premier coût de l'usine ci-dessus.", ar: "أضف أول مصروف للمصنع أعلاه." },
  "fin.addOrCopy": {
    fr: "Ajoutez un coût ci-dessus, ou copiez ceux d'un autre mois.",
    ar: "أضف مصروفًا أعلاه، أو انسخ مصاريف شهر آخر.",
  },
  "fin.confirmDeleteCost": { fr: "Supprimer le coût « {label} » ?", ar: "حذف المصروف «{label}»؟" },
  "fin.err.costType": { fr: "Le type de coût est obligatoire.", ar: "نوع المصروف إلزامي." },
  "fin.err.amount": { fr: "Le montant doit être un nombre positif.", ar: "يجب أن يكون المبلغ عددًا موجبًا." },

  "fin.calculatorNeedsInventory": {
    fr: "Le calculateur de marge compare toujours au prix de vente d'un produit fini du Stock. Créez d'abord cet inventaire.",
    ar: "تقارن حاسبة الهامش دائمًا بسعر بيع منتج نهائي من المخزون. أنشئ هذا المخزون أولًا.",
  },
  "fin.product": { fr: "Produit", ar: "المنتج" },
  "fin.currentStock": { fr: "Stock actuel : {quantity}", ar: "المخزون الحالي: {quantity}" },
  "fin.totalCostLine": { fr: "Coût total : {value}", ar: "التكلفة الإجمالية: {value}" },
  "fin.targetLabel": { fr: "Objectif : {margin}%", ar: "الهدف: {margin}%" },
  "fin.sellingAtLoss": {
    fr: "Le prix de vente actuel ({price}) est inférieur au coût unitaire ({cost}) : ce produit se vend à perte.",
    ar: "سعر البيع الحالي ({price}) أقل من تكلفة الوحدة ({cost}): هذا المنتج يُباع بخسارة.",
  },
  "fin.belowSuggested": {
    fr: "Le prix de vente actuel est {gap} en dessous du prix suggéré pour atteindre {margin}% de marge.",
    ar: "سعر البيع الحالي أقل بـ{gap} من السعر المقترح لبلوغ هامش {margin}%.",
  },
  "fin.aboveSuggested": {
    fr: "Le prix de vente actuel dépasse le prix suggéré de {gap}.",
    ar: "سعر البيع الحالي يتجاوز السعر المقترح بـ{gap}.",
  },
  "fin.monthLabel": { fr: "Mois", ar: "الشهر" },

});
