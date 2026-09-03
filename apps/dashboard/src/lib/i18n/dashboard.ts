import { catalogue } from "./catalogue";

/** The tableau de bord: month filter, KPI row, charts and every card on it. */
export const dashboard = catalogue({
  // ------------------------------------------------------------ month filter
  "dash.loading": { fr: "Chargement du tableau de bord…", ar: "جارٍ تحميل لوحة القيادة…" },
  "dash.loadFailed": { fr: "Impossible de charger le tableau de bord.", ar: "تعذّر تحميل لوحة القيادة." },
  "dash.updating": { fr: "Mise à jour…", ar: "جارٍ التحديث…" },
  "dash.monthScope": {
    fr: "Tous les chiffres ci-dessous portent sur ce mois, sauf mention contraire.",
    ar: "كل الأرقام أدناه تخصّ هذا الشهر، ما لم يُذكر خلاف ذلك.",
  },
  "dash.noAccess": {
    fr: "Votre rôle ne donne accès à aucun des indicateurs du tableau de bord. Les autres onglets restent disponibles.",
    ar: "لا يمنحك دورك الوصول إلى أيٍّ من مؤشرات لوحة القيادة. تبقى بقية التبويبات متاحة.",
  },
  "month.previous": { fr: "Mois précédent", ar: "الشهر السابق" },
  "month.next": { fr: "Mois suivant", ar: "الشهر التالي" },
  "month.label": { fr: "Mois", ar: "الشهر" },
  "month.year": { fr: "Année", ar: "السنة" },
  "month.backToToday": { fr: "Revenir à {month}", ar: "العودة إلى {month}" },

  // ------------------------------------------------------------------- KPIs
  "dash.kpi.revenue": { fr: "Chiffre d'affaires", ar: "رقم الأعمال" },
  "dash.kpi.revenueHint": {
    fr: "{count} · {average} en moyenne",
    ar: "{count} · {average} في المتوسط",
    dev: "{count} is an already-pluralised phrase, e.g. « 4 commandes »",
  },
  "dash.kpi.costs": { fr: "Charges totales", ar: "إجمالي الأعباء" },
  "dash.kpi.costsHint": {
    fr: "Matières vendues + salaires bruts + coûts d'usine",
    ar: "المواد المباعة + الأجور الإجمالية + مصاريف المصنع",
  },
  "dash.kpi.profit": { fr: "Résultat estimé", ar: "النتيجة التقديرية" },
  "dash.kpi.profitHint": { fr: "Marge {rate} du chiffre d'affaires", ar: "هامش {rate} من رقم الأعمال" },
  "dash.kpi.profitNoRevenue": { fr: "Aucun chiffre d'affaires ce mois-ci", ar: "لا يوجد رقم أعمال هذا الشهر" },
  "dash.kpi.quantity": { fr: "Quantité vendue", ar: "الكمية المباعة" },
  "dash.kpi.quantityHint": {
    fr: "Unités sorties sur les commandes du mois",
    ar: "الوحدات الخارجة على طلبات الشهر",
  },
  "dash.kpi.quantityReturned": { fr: "dont {count} retournées ce mois", ar: "منها {count} مُرجَعة هذا الشهر" },
  "dash.delta.new": { fr: "nouveau", ar: "جديد" },
  "dash.delta.period": { fr: "vs mois précédent", ar: "مقارنةً بالشهر السابق" },

  "dash.estimateWarningLead": { fr: "résultat est une estimation de gestion", ar: "النتيجة تقدير تسييري" },
  "dash.estimateWarning": {
    fr: "Le {lead}, pas un résultat comptable. Le coût des matières est valorisé au coût moyen pondéré de chaque article, les salaires au brut mensuel des employés actuellement inscrits, et rien n'y intègre l'énergie, l'amortissement des machines ni la fiscalité.",
    ar: "{lead}، وليست نتيجة محاسبية. تُقيَّم تكلفة المواد بالتكلفة المتوسطة المرجّحة لكل مادة، والأجور بالإجمالي الشهري للموظفين المسجّلين حاليًا، ولا يشمل ذلك الطاقة ولا اهتلاك الآلات ولا الجباية.",
  },

  // ------------------------------------------------------------------ trend
  "dash.trend.title": { fr: "Évolution sur 12 mois", ar: "التطوّر على 12 شهرًا" },
  "dash.trend.hint": {
    fr: "Cliquez sur un mois pour l'ouvrir. La masse salariale de chaque mois est celle des employés déjà embauchés à cette date, au salaire d'aujourd'hui — l'ERP ne conserve pas l'historique des salaires.",
    ar: "انقر على شهر لفتحه. كتلة الأجور لكل شهر هي أجور الموظفين المُوظَّفين فعلًا في ذلك التاريخ، بأجر اليوم — لا يحتفظ النظام بسجلّ الأجور السابقة.",
  },
  "dash.trend.monthlyResult": { fr: "Résultat mensuel", ar: "النتيجة الشهرية" },
  "dash.trend.empty": {
    fr: "Pas encore assez d'historique pour tracer une tendance.",
    ar: "لا يوجد سجلّ كافٍ بعد لرسم اتجاه.",
  },
  "dash.chart.revenueLabel": { fr: "Chiffre d'affaires et charges sur douze mois", ar: "رقم الأعمال والأعباء على اثني عشر شهرًا" },
  "dash.chart.resultLabel": { fr: "Résultat mensuel sur douze mois", ar: "النتيجة الشهرية على اثني عشر شهرًا" },
  "dash.chart.costSplitLabel": { fr: "Répartition des charges du mois", ar: "توزيع أعباء الشهر" },
  "dash.chart.orders": { fr: "Commandes", ar: "الطلبات" },
  "dash.chart.charges": { fr: "Charges", ar: "الأعباء" },
  "dash.chart.result": { fr: "Résultat", ar: "النتيجة" },
  "dash.chart.empty": { fr: "Rien à afficher pour ce mois.", ar: "لا شيء لعرضه لهذا الشهر." },
  "dash.chart.noCosts": { fr: "Aucune charge enregistrée pour ce mois.", ar: "لم تُسجَّل أي أعباء لهذا الشهر." },

  // ------------------------------------------------------------------ sales
  "dash.bestSellers": { fr: "Meilleures ventes", ar: "أفضل المبيعات" },
  "dash.bestSellersHint": {
    fr: "Par chiffre d'affaires facturé sur le mois.",
    ar: "حسب رقم الأعمال المفوتَر خلال الشهر.",
  },
  "dash.noSales": { fr: "Aucune vente enregistrée ce mois-ci.", ar: "لم تُسجَّل أي مبيعات هذا الشهر." },
  "dash.quantitiesSold": { fr: "Quantités vendues", ar: "الكميات المباعة" },
  "dash.quantitiesSoldHint": {
    fr: "Les mêmes ventes, classées par volume plutôt que par valeur.",
    ar: "المبيعات نفسها، مرتّبة حسب الحجم لا حسب القيمة.",
  },
  "dash.collection": { fr: "Encaissement", ar: "التحصيل" },
  "dash.collectionHint": {
    fr: "Ce qui a été facturé, ce qui est rentré, ce qui reste dû sur les commandes du mois.",
    ar: "ما فُوتِر، وما تم تحصيله، وما بقي مستحقًا على طلبات الشهر.",
  },
  "dash.invoiced": { fr: "Facturé", ar: "مفوتَر" },
  "dash.collected": { fr: "Encaissé", ar: "محصَّل" },
  "dash.outstanding": { fr: "Reste dû", ar: "الباقي المستحق" },
  "dash.collectedShare": { fr: "{rate} du mois encaissé.", ar: "تم تحصيل {rate} من الشهر." },
  "dash.nothingInvoiced": { fr: "Rien de facturé ce mois-ci.", ar: "لم يُفوتَر شيء هذا الشهر." },
  "dash.returnedGoods": { fr: "{value} de marchandise retournée.", ar: "{value} من البضاعة المرجَعة." },
  "dash.topCustomers": { fr: "Meilleurs clients", ar: "أفضل الزبائن" },

  // ------------------------------------------------------------------ costs
  "dash.costSplit": { fr: "Composition des charges", ar: "تركيبة الأعباء" },
  "dash.costSplitHint": { fr: "Ce que le mois a réellement coûté, par nature.", ar: "ما كلّفه الشهر فعليًا، حسب الطبيعة." },
  "dash.cost.materials": { fr: "Matières vendues", ar: "المواد المباعة" },
  "dash.cost.payroll": { fr: "Salaires bruts", ar: "الأجور الإجمالية" },
  "dash.cost.factory": { fr: "Coûts d'usine", ar: "مصاريف المصنع" },
  "dash.cost.monthTotal": { fr: "Charges du mois", ar: "أعباء الشهر" },
  "dash.cost.purchases": { fr: "Achats de stock", ar: "مشتريات المخزون" },
  "dash.cost.purchasesHint": { fr: "Trésorerie sortie — hors résultat", ar: "خزينة خارجة — خارج النتيجة" },
  "dash.factoryCosts": { fr: "Postes de coûts d'usine", ar: "بنود مصاريف المصنع" },
  "dash.factoryCostsHint": {
    fr: "Le ledger des coûts généraux du mois, regroupé par libellé.",
    ar: "سجلّ المصاريف العامة للشهر، مجمّعًا حسب التسمية.",
  },
  "dash.biggestCost": { fr: "Poste le plus lourd", ar: "أثقل بند" },
  "dash.noFactoryCosts": { fr: "Aucun coût d'usine saisi pour ce mois.", ar: "لم تُدخَل أي مصاريف مصنع لهذا الشهر." },

  // -------------------------------------------------------------- materials
  "dash.materials": { fr: "Matières premières du mois", ar: "المواد الأولية للشهر" },
  "dash.materialsHint": {
    fr: "Ce qui est entré et ce qui a été consommé, sur les inventaires marqués comme entrants de production.",
    ar: "ما دخل وما استُهلك، على المخزونات المصنّفة كمدخلات إنتاج.",
  },
  "dash.purchased": { fr: "Acheté", ar: "المشترى" },
  "dash.consumed": { fr: "Consommé", ar: "المستهلَك" },
  "dash.mostBought": { fr: "Les plus achetées", ar: "الأكثر شراءً" },
  "dash.mostUsed": { fr: "Les plus utilisées", ar: "الأكثر استعمالًا" },
  "dash.noMaterialIn": { fr: "Aucune entrée de matière ce mois-ci.", ar: "لا توجد أي مدخلات مواد هذا الشهر." },
  "dash.noMaterialOut": { fr: "Aucune sortie de matière ce mois-ci.", ar: "لا توجد أي مخرجات مواد هذا الشهر." },
  "dash.mostExpensive": { fr: "Matières les plus chères", ar: "أغلى المواد" },
  "dash.mostExpensiveHint": {
    fr: "Coût unitaire moyen, calculé sur tout l'historique d'entrées de l'article — pas seulement ce mois.",
    ar: "تكلفة الوحدة المتوسطة، محسوبة على كامل سجلّ مدخلات المادة — لا على هذا الشهر وحده.",
  },
  "dash.noValuedMaterial": { fr: "Aucune matière valorisée pour l'instant.", ar: "لا توجد مواد مُقيَّمة حاليًا." },

  // --------------------------------------------------------------------- hr
  "dash.employees": { fr: "Employés", ar: "الموظفون" },
  "dash.employeesHint": {
    fr: "Masse salariale des employés inscrits, heures pointées sur le mois.",
    ar: "كتلة أجور الموظفين المسجّلين، والساعات المسجَّلة خلال الشهر.",
  },
  "dash.headcount": { fr: "Effectif", ar: "عدد الموظفين" },
  "dash.payrollGross": { fr: "Masse salariale brute", ar: "كتلة الأجور الإجمالية" },
  "dash.hoursLogged": { fr: "Heures pointées", ar: "الساعات المسجَّلة" },
  "dash.absenceDays": { fr: "Jours d'absence", ar: "أيام الغياب" },
  "dash.topPaid": { fr: "Les mieux payés", ar: "الأعلى أجرًا" },
  "dash.topPaidMeta": { fr: "{position} · net estimé {net}", ar: "{position} · الصافي التقديري {net}" },
  "dash.topHours": { fr: "Les plus d'heures ce mois", ar: "الأكثر ساعات هذا الشهر" },
  "dash.noEmployees": { fr: "Aucun employé enregistré.", ar: "لا يوجد أي موظف مسجّل." },
  "dash.noHours": { fr: "Aucune heure pointée ce mois-ci.", ar: "لم تُسجَّل أي ساعة هذا الشهر." },

  // ------------------------------------------------------------------ zakat
  "dash.zakat": { fr: "Zakat", ar: "الزكاة" },
  "dash.zakatPinned": {
    fr: "Calcul épinglé par le gérant — figé, pas recalculé.",
    ar: "حساب ثبّته المسيّر — مجمَّد، لا يُعاد حسابه.",
  },
  "dash.zakatLive": {
    fr: "Estimation automatique à l'instant, à partir du stock et des créances.",
    ar: "تقدير آلي في الحين، انطلاقًا من المخزون والذمم.",
  },
  "dash.zakatDue": { fr: "Zakat due", ar: "الزكاة المستحقة" },
  "dash.zakatBelowNisab": { fr: "Sous le nisab", ar: "دون النصاب" },
  "dash.zakatRemaining": { fr: "Reste à verser", ar: "يبقى للدفع" },
  "dash.zakatPaidLabel": { fr: "Versée", ar: "مُؤدّاة" },
  "dash.zakatBase": { fr: "Base zakatable {base} · nisab {nisab}", ar: "الوعاء الزكوي {base} · النصاب {nisab}" },
  "dash.paid": { fr: "Versé", ar: "المدفوع" },
  "dash.remaining": { fr: "Reste", ar: "الباقي" },
  "dash.dueDate": { fr: "Échéance", ar: "الأجل" },

  // ------------------------------------------------------------------ stock
  "dash.stockNow": { fr: "Stock à l'instant", ar: "المخزون في الحين" },
  "dash.stockNowHint": {
    fr: "Un état des lieux, pas un chiffre du mois : le stock n'est jamais reconstitué à une date passée.",
    ar: "حالة راهنة لا رقم شهري: لا يُعاد بناء المخزون إلى تاريخ ماضٍ أبدًا.",
  },
  "dash.goToStock": { fr: "Voir le stock →", ar: "عرض المخزون ←" },
  "dash.stockValue": { fr: "Valeur du stock", ar: "قيمة المخزون" },
  "dash.trackedItems": { fr: "Articles suivis", ar: "المواد المتابَعة" },
  "dash.belowThreshold": { fr: "Sous le seuil", ar: "دون العتبة" },
  "dash.valueByInventory": { fr: "Valeur par inventaire", ar: "القيمة حسب المخزون" },
  "dash.noValuedItems": { fr: "Aucun article valorisé.", ar: "لا توجد مواد مُقيَّمة." },
  "dash.toReorder": { fr: "À réapprovisionner", ar: "للتموين" },
  "dash.allAboveThreshold": {
    fr: "Tout est au-dessus du seuil de réapprovisionnement.",
    ar: "كل شيء فوق عتبة التموين.",
  },
  "dash.threshold": { fr: "seuil {value}", ar: "العتبة {value}" },

  // ---------------------------------------------------------------- plurals
  "dash.orderCount.one": { fr: "{count} commande", ar: "طلب واحد" },
  "dash.orderCount.two": { fr: "{count} commandes", ar: "طلبان" },
  "dash.orderCount.few": { fr: "{count} commandes", ar: "{count} طلبات" },
  "dash.orderCount.other": { fr: "{count} commandes", ar: "{count} طلبًا" },
  "dash.itemCount.one": { fr: "{count} article", ar: "مادة واحدة" },
  "dash.itemCount.two": { fr: "{count} articles", ar: "مادتان" },
  "dash.itemCount.few": { fr: "{count} articles", ar: "{count} مواد" },
  "dash.itemCount.other": { fr: "{count} articles", ar: "{count} مادة" },
});
