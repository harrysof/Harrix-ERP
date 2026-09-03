import { catalogue } from "./catalogue";

/**
 * ZAKATI: the Zakat calculation, its history, and the dashboard.
 *
 * This is the one module where the Arabic is the *original* vocabulary and
 * the French is the translation, not the other way round: نصاب (nisab, the
 * threshold), حول (hawl, the lunar year a sum must be held), وعاء زكوي (the
 * zakatable base). Where the two disagree, the Arabic term is the correct one
 * and the French is a gloss of it — do not "improve" the Arabic to match a
 * literal reading of the French.
 */
export const zakat = catalogue({
  // ------------------------------------------------------------------- tabs
  "zk.tabDashboard": { fr: "Tableau de bord", ar: "لوحة القيادة" },
  "zk.tabCalculation": { fr: "Calcul de la Zakat", ar: "حساب الزكاة" },
  "zk.tabHistory": { fr: "Historique", ar: "السجلّ" },

  // ------------------------------------------------------------ vocabulary
  "zk.methodology.LUNAR": {
    fr: "Année lunaire (hégirienne) — hawl standard",
    ar: "السنة القمرية (الهجرية) — الحول المعتمد",
  },
  "zk.methodology.SOLAR": {
    fr: "Année solaire (grégorienne) — méthode alternative",
    ar: "السنة الشمسية (الميلادية) — طريقة بديلة",
  },
  "zk.payment.NOT_PAID": { fr: "Non payée", ar: "غير مدفوعة" },
  "zk.payment.PARTIALLY_PAID": { fr: "Partiellement payée", ar: "مدفوعة جزئيًا" },
  "zk.payment.PAID": { fr: "Payée", ar: "مدفوعة" },

  // --------------------------------------------------------------- dashboard
  "zk.loadFailed": { fr: "Impossible de charger la Zakat.", ar: "تعذّر تحميل الزكاة." },
  "zk.due": { fr: "Zakat due", ar: "الزكاة المستحقة" },
  "zk.noneBelowNisab": { fr: "Aucune (sous le nisab)", ar: "لا شيء (دون النصاب)" },
  "zk.netBase": { fr: "Base nette de Zakat", ar: "الوعاء الزكوي الصافي" },
  "zk.nisab": { fr: "Nisab (85 g d'or)", ar: "النصاب (85 غ ذهبًا)" },
  "zk.goldPrice": { fr: "Prix de l'or", ar: "سعر الذهب" },
  "zk.refreshGold": { fr: "Actualiser le prix de l'or", ar: "تحديث سعر الذهب" },
  "zk.refreshGoldFailed": {
    fr: "Actualisation du prix de l'or impossible.",
    ar: "تعذّر تحديث سعر الذهب.",
  },
  "zk.autoEstimate": { fr: "Estimation automatique", ar: "تقدير آلي" },
  "zk.lastOfficial": { fr: "Dernier calcul officiel", ar: "آخر حساب رسمي" },
  "zk.estimateDue": { fr: "Estimation : Zakat probablement due", ar: "تقدير: الزكاة مستحقة على الأرجح" },
  "zk.estimateBelowNisab": {
    fr: "Estimation : sous le nisab, aucune Zakat due",
    ar: "تقدير: دون النصاب، لا زكاة مستحقة",
  },
  "zk.liveStock": { fr: "Live · Stock", ar: "مباشر · المخزون" },
  "zk.liveSales": { fr: "Live · Ventes", ar: "مباشر · المبيعات" },
  "zk.finishedAndMaterials": { fr: "Produits finis + matières", ar: "المنتجات النهائية + المواد" },
  "zk.bankFromPaid": { fr: "Banque (ventes payées)", ar: "البنك (مبيعات مدفوعة)" },
  "zk.receivablesShipped": {
    fr: "Créances (expédié, non payé)",
    ar: "الذمم (مُرسَل وغير مدفوع)",
  },
  "zk.paymentStatus": { fr: "Statut de paiement", ar: "حالة الدفع" },
  "zk.dueDate": { fr: "Échéance de la Zakat", ar: "أجل الزكاة" },
  "zk.redoCalculation": { fr: "Refaire un calcul", ar: "إعادة الحساب" },
  "zk.aboutHijriDates": { fr: "À propos des dates hégiriennes", ar: "حول التواريخ الهجرية" },
  "zk.hijriEstimateLead": {
    fr: "estimations par calcul arithmétique",
    ar: "تقديرات بحساب رياضي",
  },
  "zk.hijriNote": {
    fr: "Les dates hégiriennes affichées sur cette page sont des {lead} : le calendrier officiel dépend de l'observation de la lune et peut différer d'un jour. Vérifiez auprès de votre autorité religieuse locale pour toute échéance qui compte.",
    ar: "التواريخ الهجرية المعروضة في هذه الصفحة هي {lead}: التقويم الرسمي يعتمد على رؤية الهلال وقد يختلف بيوم. تحقّق من الجهة الدينية المحلية لأي أجل مهم.",
  },

  // ------------------------------------------------------------ calculation
  "zk.loadAutoFailed": {
    fr: "Impossible de charger les valeurs automatiques.",
    ar: "تعذّر تحميل القيم الآلية.",
  },
  "zk.loadingAuto": { fr: "— chargement des valeurs automatiques…", ar: "— جارٍ تحميل القيم الآلية…" },
  "zk.dateAndMethod": { fr: "Date et méthodologie", ar: "التاريخ والطريقة" },
  "zk.calculationDate": { fr: "Date de calcul", ar: "تاريخ الحساب" },
  "zk.hawlAnchor": { fr: "L'ancrage du hawl", ar: "مرتكز الحول" },
  "zk.methodology": { fr: "Méthodologie", ar: "الطريقة" },
  "zk.goldPriceLabel": { fr: "Prix de l'or (DZD/gramme)", ar: "سعر الذهب (دج/غرام)" },
  "zk.goldPriceHint": {
    fr: "Sert à calculer le nisab (85 g) · {source}, {date}{stale}, modifiable",
    ar: "يُستعمل لحساب النصاب (85 غ) · {source}، {date}{stale}، قابل للتعديل",
  },
  "zk.goldPriceHintShort": { fr: "Sert à calculer le nisab (85 g)", ar: "يُستعمل لحساب النصاب (85 غ)" },
  "zk.goldCached": { fr: " (en cache)", ar: " (مخزَّن مؤقتًا)" },
  "zk.refreshFromSource": { fr: "Actualiser depuis goldrate24.com", ar: "التحديث من goldrate24.com" },
  "zk.err.goldPrice": {
    fr: "Le prix de l'or (DZD/gramme) est obligatoire pour calculer le nisab.",
    ar: "سعر الذهب (دج/غرام) إلزامي لحساب النصاب.",
  },

  "zk.zakatableAssets": { fr: "Actifs zakatables", ar: "الأصول الزكوية" },
  "zk.liquidity": { fr: "Liquidités", ar: "السيولة" },
  "zk.cash": { fr: "Caisse", ar: "الصندوق" },
  "zk.cashDzd": { fr: "Caisse (DZD)", ar: "الصندوق (دج)" },
  "zk.cashHint": {
    fr: "Non suivie automatiquement (pas de registre de caisse)",
    ar: "غير متابَعة آليًا (لا يوجد سجلّ صندوق)",
  },
  "zk.bank": { fr: "Banque", ar: "البنك" },
  "zk.bankDzd": { fr: "Banque (DZD)", ar: "البنك (دج)" },
  "zk.bankHint": {
    fr: "Pré-rempli depuis Ventes → commandes payées, modifiable",
    ar: "مملوء مسبقًا من المبيعات ← الطلبات المدفوعة، قابل للتعديل",
  },
  "zk.finishedGoods": { fr: "Produits finis", ar: "المنتجات النهائية" },
  "zk.finishedGoodsDzd": { fr: "Produits finis (DZD)", ar: "المنتجات النهائية (دج)" },
  "zk.finishedGoodsHint": {
    fr: "Pré-rempli depuis Stock → Produits finis, modifiable",
    ar: "مملوء مسبقًا من المخزون ← المنتجات النهائية، قابل للتعديل",
  },
  "zk.rawMaterials": { fr: "Matières premières éligibles", ar: "المواد الأولية المؤهَّلة" },
  "zk.rawMaterialsDzd": { fr: "Matières premières éligibles (DZD)", ar: "المواد الأولية المؤهَّلة (دج)" },
  "zk.rawMaterialsHint": {
    fr: "Pré-rempli depuis Stock → matières premières, modifiable",
    ar: "مملوء مسبقًا من المخزون ← المواد الأولية، قابل للتعديل",
  },
  "zk.receivablesSection": { fr: "Créances et autres actifs", ar: "الذمم والأصول الأخرى" },
  "zk.receivables": { fr: "Créances recouvrables", ar: "الذمم القابلة للتحصيل" },
  "zk.receivablesDzd": { fr: "Créances recouvrables (DZD)", ar: "الذمم القابلة للتحصيل (دج)" },
  "zk.receivablesHint": {
    fr: "Pré-rempli depuis Ventes → commandes expédiées non payées, modifiable",
    ar: "مملوء مسبقًا من المبيعات ← الطلبات المُرسَلة غير المدفوعة، قابل للتعديل",
  },
  "zk.otherAssets": { fr: "Autres actifs éligibles", ar: "أصول أخرى مؤهَّلة" },
  "zk.otherAssetsDzd": { fr: "Autres actifs éligibles (DZD)", ar: "أصول أخرى مؤهَّلة (دج)" },
  "zk.deductionsSection": { fr: "Déductions et taux", ar: "الخصوم والنسبة" },
  "zk.deductions": { fr: "Déductions éligibles (dettes frs)", ar: "الخصوم المؤهَّلة (ديون الموردين)" },
  "zk.deductionsDzd": { fr: "Déductions éligibles (DZD)", ar: "الخصوم المؤهَّلة (دج)" },
  "zk.deductionsHint": {
    fr: "Ex. nette fournisseur — non suivi automatiquement",
    ar: "مثال: صافي المورّد — غير متابَع آليًا",
  },
  "zk.rate": { fr: "Taux de Zakat", ar: "نسبة الزكاة" },
  "zk.rateDzd": { fr: "Taux de Zakat (%)", ar: "نسبة الزكاة (%)" },
  "zk.total": { fr: "TOTAL", ar: "المجموع" },
  "zk.zakatDueCaps": { fr: "ZAKAT DUE", ar: "الزكاة المستحقة" },
  "zk.save": { fr: "Enregistrer le calcul", ar: "حفظ الحساب" },
  "zk.saveAndPin": {
    fr: "Enregistrer et exporter vers le tableau de bord",
    ar: "الحفظ والتصدير إلى لوحة القيادة",
  },
  "zk.pin": { fr: "Exporter vers le tableau de bord", ar: "التصدير إلى لوحة القيادة" },
  "zk.pinFailed": { fr: "Export impossible.", ar: "تعذّر التصدير." },
  "zk.savedAndPinned": { fr: " et exporté vers le tableau de bord", ar: " وصُدِّر إلى لوحة القيادة" },
  "zk.viewInHistory": { fr: "Voir dans l'historique", ar: "عرضه في السجلّ" },
  "zk.viewDashboard": { fr: "Voir le tableau de bord", ar: "عرض لوحة القيادة" },

  // ---------------------------------------------------------------- history
  "zk.loadHistoryFailed": { fr: "Impossible de charger l'historique.", ar: "تعذّر تحميل السجلّ." },
  "zk.noCalculations": { fr: "Aucun calcul enregistré", ar: "لا توجد حسابات مسجّلة" },
  "zk.historyAppears": {
    fr: "Chaque calcul de Zakat effectué apparaîtra ici, avec son suivi de paiement.",
    ar: "سيظهر هنا كل حساب زكاة أُجري، مع متابعة دفعه.",
  },
  "zk.col.calcDate": { fr: "Date de calcul", ar: "تاريخ الحساب" },
  "zk.col.base": { fr: "Base Zakat", ar: "الوعاء الزكوي" },
  "zk.col.paid": { fr: "Payé", ar: "المدفوع" },
  "zk.col.remaining": { fr: "Restant", ar: "الباقي" },
  "zk.onDashboard": { fr: "Sur le tableau de bord", ar: "على لوحة القيادة" },
  "zk.unpin": { fr: "Retirer du tableau de bord", ar: "إزالة من لوحة القيادة" },
  "zk.recordPayment": { fr: "Enregistrer un paiement", ar: "تسجيل دفعة" },
  "zk.amountPaidDzd": { fr: "Montant payé (DZD)", ar: "المبلغ المدفوع (دج)" },
  "zk.paymentDate": { fr: "Date de paiement", ar: "تاريخ الدفع" },
  "zk.err.amountPaid": {
    fr: "Le montant payé doit être un nombre positif.",
    ar: "يجب أن يكون المبلغ المدفوع عددًا موجبًا.",
  },

  "zk.autoRecomputed": {
    fr: "Banque (ventes payées), produits finis, matières premières et créances sont recalculés en direct depuis Stock et Ventes. Caisse et déductions ne sont pas suivies automatiquement (comptées à 0 ici) — affinez dans « Calcul de la Zakat ».",
    ar: "البنك (المبيعات المدفوعة) والمنتجات النهائية والمواد الأولية والذمم يُعاد حسابها مباشرةً من المخزون والمبيعات. أما الصندوق والخصوم فليسا متابَعين آليًا (يُحتسبان صفرًا هنا) — دقّقهما في «حساب الزكاة».",
  },
  "zk.live": { fr: "Live", ar: "مباشر" },
  "zk.refreshing": { fr: "Actualisation…", ar: "جارٍ التحديث…" },
  "zk.goldSourceHint": { fr: "{source} — {date}{stale}", ar: "{source} — {date}{stale}" },
  "zk.assetsVsNisab": {
    fr: "Patrimoine estimé ({assets}) {comparator} nisab actuel ({nisab}, 85 g d'or){suffix}",
    ar: "الذمة المالية المقدَّرة ({assets}) {comparator} النصاب الحالي ({nisab}، 85 غ ذهبًا){suffix}",
  },
  "zk.belowThresholdSuffix": {
    fr: " — en dessous du seuil, aucune Zakat n'est due.",
    ar: " — دون العتبة، لا زكاة مستحقة.",
  },
  "zk.dueIfHawlToday": {
    fr: "Échéance si le hawl commençait aujourd'hui : {hijri} ({date}).",
    ar: "الأجل لو بدأ الحول اليوم: {hijri} ({date}).",
  },
  "zk.newCalculation": { fr: "+ Faire un calcul", ar: "+ إجراء حساب" },
  "zk.nothingPinned": {
    fr: "Aucun calcul n'a encore été exporté vers le tableau de bord. Faites un calcul complet (caisse, déductions…) dans l'onglet « Calcul de la Zakat », puis exportez-le ici.",
    ar: "لم يُصدَّر أي حساب إلى لوحة القيادة بعد. أجرِ حسابًا كاملًا (الصندوق، الخصوم…) في تبويب «حساب الزكاة»، ثم صدّره هنا.",
  },
  "zk.calculatedOn": { fr: "Calculé le {date} ({hijri}).", ar: "حُسِب في {date} ({hijri})." },
  "zk.hijriHelpFull": {
    fr: "Les dates hégiriennes affichées sur cette page sont des {lead} (calendrier tabulaire), pas des dates confirmées par observation de la lune — elles peuvent différer d'un jour ou deux du calendrier local. Vérifiez auprès d'un savant ou d'une institution de référence avant le paiement.",
    ar: "التواريخ الهجرية المعروضة في هذه الصفحة هي {lead} (تقويم جدولي)، لا تواريخ مؤكَّدة برؤية الهلال — وقد تختلف بيوم أو يومين عن التقويم المحلّي. تحقّق من عالم أو مؤسسة مرجعية قبل الدفع.",
  },
  "zk.dueSubtitle": { fr: "Zakat due : {value}", ar: "الزكاة المستحقة: {value}" },

  "zk.tradeStock": { fr: "Stock de négoce", ar: "مخزون التجارة" },
  "zk.savedNotice": { fr: "Calcul enregistré{suffix}. ", ar: "تم حفظ الحساب{suffix}. " },




});
