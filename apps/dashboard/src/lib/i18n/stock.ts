import { catalogue } from "./catalogue";

/**
 * Stock: the four inventories, the article fiche, receptions, usages and
 * supplier orders.
 *
 * A note for whoever translates the next language. The domain nouns here are
 * the factory's own vocabulary, and two of them are worth pinning down:
 *   - « lot » is a *received batch* of a chemical (a numbered delivery with an
 *     expiry), never a production run — that one is « lot de production » and
 *     lives in production.ts as دفعة إنتاج.
 *   - « tige » is the upper of a shoe, the part stitched before it meets the
 *     sole. الوجه العلوي, not "stem".
 */
export const stock = catalogue({
  // ------------------------------------------------------------------- page
  "stock.loading": { fr: "Chargement du stock…", ar: "جارٍ تحميل المخزون…" },
  "stock.loadFailed": { fr: "Impossible de charger le stock.", ar: "تعذّر تحميل المخزون." },
  "stock.search": { fr: "Rechercher par nom ou référence…", ar: "البحث بالاسم أو المرجع…" },
  "stock.newItem": { fr: "+ Nouvel article", ar: "+ مادة جديدة" },
  "stock.newInventory": { fr: "+ Inventaire", ar: "+ مخزون" },
  "stock.newInventoryTitle": {
    fr: "Ajouter un inventaire (un nouvel onglet de stock)",
    ar: "إضافة مخزون (تبويب جديد في المخزون)",
  },
  "stock.configureInventory": { fr: "Configurer cet inventaire", ar: "إعداد هذا المخزون" },
  "stock.deleteInventory": { fr: "Supprimer l'inventaire", ar: "حذف المخزون" },
  "stock.supplierOrders": { fr: "Commandes fournisseurs", ar: "طلبات الموردين" },
  "stock.noMatch": { fr: "Aucun article ne correspond à la recherche", ar: "لا توجد مادة تطابق البحث" },
  "stock.productionFed": {
    fr: "Ce module sera alimenté automatiquement par la Production (onglet Production). En attendant, vous pouvez ajouter des articles à la main.",
    ar: "سيُغذّى هذا المخزون تلقائيًا من الإنتاج (تبويب الإنتاج). في انتظار ذلك، يمكنك إضافة المواد يدويًا.",
  },

  // --------------------------------------------------------------- headings
  "stock.col.item": { fr: "Article", ar: "المادة" },
  "stock.col.remaining": { fr: "Restant", ar: "المتبقّي" },
  "stock.col.purchased": { fr: "Acheté", ar: "المشترى" },
  "stock.col.used": { fr: "Utilisé", ar: "المستعمَل" },
  "stock.col.unitCostShort": { fr: "Coût unit.", ar: "تكلفة الوحدة" },
  "stock.col.stockValue": { fr: "Valeur stock", ar: "قيمة المخزون" },
  "stock.col.salePriceShort": { fr: "Prix vente", ar: "سعر البيع" },
  "stock.col.reorderShort": { fr: "Réapp.", ar: "التموين" },
  "stock.col.quality": { fr: "Qualité", ar: "الجودة" },
  "stock.col.color": { fr: "Couleur", ar: "اللون" },
  "stock.col.size": { fr: "Taille", ar: "المقاس" },
  "stock.col.gender": { fr: "Sexe", ar: "الجنس" },
  "stock.col.manufacturer": { fr: "Fabricant", ar: "الصانع" },
  "stock.col.location": { fr: "Localisation", ar: "الموقع" },
  "stock.col.criticality": { fr: "Criticité", ar: "الحرجية" },
  "stock.col.compatibility": { fr: "Compatibilité", ar: "التوافق" },

  // ------------------------------------------------------------- statistics
  "stock.totalValue": { fr: "Valeur totale du stock", ar: "القيمة الإجمالية للمخزون" },
  "stock.allInventories": { fr: "Tous inventaires confondus", ar: "كل المخزونات مجتمعة" },
  "stock.inventoryValue": { fr: "Valeur de cet inventaire", ar: "قيمة هذا المخزون" },
  "stock.weightedAverage": {
    fr: "Coût moyen pondéré d'une unité, calculé sur ce qui est réellement entré en stock",
    ar: "التكلفة المتوسطة المرجّحة للوحدة، محسوبة على ما دخل فعلًا إلى المخزون",
  },
  "stock.weightedAverageShort": {
    fr: "Coût moyen pondéré de ce qui est réellement entré",
    ar: "التكلفة المتوسطة المرجّحة لما دخل فعلًا",
  },
  "stock.remainingTimesCost": {
    fr: "Quantité restante × coût unitaire moyen",
    ar: "الكمية المتبقّية × تكلفة الوحدة المتوسطة",
  },
  "stock.noValuedEntry": {
    fr: "Aucune entrée valorisée pour cet article",
    ar: "لا يوجد أي إدخال مُقيَّم لهذه المادة",
  },
  "stock.unpriced": {
    fr: "{quantity} en stock sans coût connu — non compté",
    ar: "{quantity} في المخزون بدون تكلفة معروفة — غير محتسَبة",
  },
  "stock.materialCostLead": { fr: "coût matières estimé", ar: "تكلفة مواد تقديرية" },
  "stock.materialCostWarning": {
    fr: "Le coût affiché ici est un {lead} : il ne comprend que les matières premières consommées par la production, ni main-d'œuvre ni frais généraux.",
    ar: "التكلفة المعروضة هنا هي {lead}: لا تشمل سوى المواد الأولية التي استهلكها الإنتاج، دون يد عاملة ولا مصاريف عامة.",
  },
  "stock.materialCost": { fr: "Coût matières", ar: "تكلفة المواد" },

  // ------------------------------------------------------------ stock state
  "stock.state.good": { fr: "Bien", ar: "جيّد" },
  "stock.state.mid": { fr: "Moyen", ar: "متوسّط" },
  "stock.state.low": { fr: "Faible", ar: "منخفض" },
  "stock.state.lowLong": { fr: "Faible · à réapprovisionner", ar: "منخفض · يحتاج تموينًا" },
  "stock.aboveThreshold": { fr: "Stock au-dessus du seuil", ar: "المخزون فوق العتبة" },
  "stock.belowThreshold": { fr: "Stock sous le seuil — commander", ar: "المخزون دون العتبة — يجب الطلب" },

  // ------------------------------------------------------------------ lots
  "stock.lot.expired": { fr: "Périmé", ar: "منتهي الصلاحية" },
  "stock.lot.expiredInStock": { fr: "Lot périmé en stock", ar: "دفعة منتهية الصلاحية في المخزون" },
  "stock.lot.expiresOn": { fr: "Expire le {date}", ar: "تنتهي في {date}" },
  "stock.lot.expiryShort": { fr: "exp. {date}", ar: "انتهاء {date}" },
  "stock.lot.noExpiry": { fr: "Sans péremption", ar: "بدون صلاحية" },
  "stock.lot.none": { fr: "Aucun lot disponible", ar: "لا توجد دفعة متاحة" },
  "stock.lot.nextFefo": { fr: "Prochain lot (FEFO)", ar: "الدفعة التالية (FEFO)" },
  "stock.lot.nextFifo": { fr: "Prochain lot (FIFO)", ar: "الدفعة التالية (FIFO)" },
  "stock.lot.nextToUse": { fr: "{label} à consommer", ar: "{label} للاستهلاك" },
  "stock.lot.recommended": { fr: "recommandé", ar: "موصى بها" },
  "stock.lot.remainingUnits": { fr: "{batch} · {quantity} restants", ar: "{batch} · {quantity} متبقّية" },

  // ------------------------------------------------------------ item fiche
  "item.receivedOn": { fr: "Reçu le", ar: "استُلمت في" },
  "item.expiresOnCol": { fr: "Expire le", ar: "تنتهي في" },
  "item.inStock": { fr: "En stock", ar: "في المخزون" },
  "item.averageUnitCost": { fr: "Coût unitaire moyen", ar: "تكلفة الوحدة المتوسطة" },
  "item.materialCostPerUnit": { fr: "Coût matières / unité", ar: "تكلفة المواد / وحدة" },
  "item.standardCost": { fr: "Coût standard", ar: "التكلفة المعيارية" },
  "item.reorderShort": { fr: "Réappro.", ar: "التموين" },
  "item.reorderThreshold": { fr: "Seuil réappro.", ar: "عتبة التموين" },
  "item.stockValue": { fr: "Valeur du stock", ar: "قيمة المخزون" },
  "item.embeddedPhoto": { fr: "Photo intégrée", ar: "صورة مدمجة" },
  "item.producedCostHint": {
    fr: "Matières premières seulement — hors main-d'œuvre et frais",
    ar: "المواد الأولية فقط — دون يد عاملة ولا مصاريف",
  },
  "item.producedCostWarning": {
    fr: "Coût matières estimé uniquement. Il ne comprend que les matières premières consommées par les lots de production qui ont fabriqué cet article — ni main-d'œuvre, ni énergie, ni amortissement machine, ni frais généraux. Le coût de revient réel est plus élevé.",
    ar: "تكلفة مواد تقديرية فقط. لا تشمل سوى المواد الأولية التي استهلكتها دفعات الإنتاج التي صنعت هذه المادة — دون يد عاملة ولا طاقة ولا اهتلاك آلات ولا مصاريف عامة. سعر التكلفة الحقيقي أعلى.",
  },

  "item.valueSection": { fr: "Valeur & provenance", ar: "القيمة والمصدر" },
  "item.valueIntro": {
    fr: "D'où vient la valeur de cet article : chaque entrée en stock arrive avec son prix, et le coût unitaire affiché en est la moyenne pondérée. Rien n'est stocké — tout est recalculé à partir des mouvements.",
    ar: "من أين تأتي قيمة هذه المادة: كل إدخال إلى المخزون يصل بسعره، وتكلفة الوحدة المعروضة هي متوسطها المرجّح. لا شيء مخزَّن — كل شيء يُعاد حسابه من الحركات.",
  },
  "item.noValuedEntries": {
    fr: "Aucune entrée en stock à valoriser pour le moment.",
    ar: "لا توجد مدخلات مخزون للتقييم حاليًا.",
  },
  "item.col.origin": { fr: "Provenance", ar: "المصدر" },
  "item.col.documents": { fr: "Documents", ar: "الوثائق" },
  "item.col.quantityIn": { fr: "Quantité entrée", ar: "الكمية الداخلة" },
  "item.totalIn": { fr: "Total entré", ar: "إجمالي الداخل" },
  "item.remainingValue": { fr: "Valeur du stock restant", ar: "قيمة المخزون المتبقّي" },
  "item.ofWhichUnpriced": { fr: "· dont {quantity} sans prix", ar: "· منها {quantity} بلا سعر" },

  "item.machineSection": { fr: "Machine & compatibilité", ar: "الآلة والتوافق" },
  "item.qualitySection": { fr: "Classification de la production", ar: "تصنيف الإنتاج" },
  "item.lotsSection": { fr: "Lots & péremption", ar: "الدفعات والصلاحية" },
  "item.noLotsWithStock": { fr: "Aucun lot avec du stock restant.", ar: "لا توجد دفعة بها مخزون متبقٍّ." },
  "item.loadingLots": { fr: "Chargement des lots…", ar: "جارٍ تحميل الدفعات…" },
  "item.noLots": { fr: "Aucun lot enregistré pour cet article.", ar: "لا توجد دفعات مسجّلة لهذه المادة." },

  "item.productionSection": { fr: "Activité production liée", ar: "نشاط الإنتاج المرتبط" },
  "item.productionIntro": {
    fr: "Sorties enregistrées avec la raison « Production ».",
    ar: "المخرجات المسجّلة بسبب «الإنتاج».",
  },
  "item.notUsedInProduction": {
    fr: "Cet article n'a pas encore été utilisé en production.",
    ar: "لم تُستعمل هذه المادة في الإنتاج بعد.",
  },
  "item.consumedValue": { fr: "Valeur consommée", ar: "القيمة المستهلَكة" },

  "item.movementsSection": { fr: "Historique des mouvements", ar: "سجلّ الحركات" },
  "item.movementsIntro": {
    fr: "Entrées = achats (fournisseur) · Sorties = consommations (raison) · stock = entrées − sorties. Chaque ligne porte le prix auquel elle est entrée ou sortie, et d'où elle vient.",
    ar: "المدخلات = مشتريات (مورّد) · المخرجات = استهلاكات (سبب) · المخزون = المدخلات − المخرجات. كل سطر يحمل السعر الذي دخل أو خرج به، ومن أين جاء.",
  },
  "item.noMovements": {
    fr: "Aucun mouvement enregistré pour cet article.",
    ar: "لا توجد حركات مسجّلة لهذه المادة.",
  },
  "item.col.movement": { fr: "Mouvement", ar: "الحركة" },
  "item.col.unitCostShort": { fr: "Coût unit.", ar: "تكلفة الوحدة" },
  "item.movementIn": { fr: "Entrée", ar: "إدخال" },
  "item.movementOut": { fr: "Sortie", ar: "إخراج" },
  "item.uncategorisedIn": { fr: "· entrée non classée", ar: "· إدخال غير مصنّف" },

  // ---------------------------------------------------- movement provenance
  "source.manual": { fr: "Réception directe", ar: "استلام مباشر" },
  "source.supplierOrder": { fr: "Commande fournisseur", ar: "طلب مورّد" },
  "source.purchase": { fr: "Achat (bon de commande)", ar: "شراء (سند طلب)" },
  "source.production": { fr: "Production", ar: "إنتاج" },
  "source.sale": { fr: "Vente", ar: "بيع" },

  // ---------------------------------------------------------- quality class
  "quality.first": { fr: "1er choix", ar: "اختيار أول" },
  "quality.second": { fr: "2ème choix", ar: "اختيار ثانٍ" },
  "quality.secondShort": { fr: "2ème", ar: "الثاني" },
  "quality.reject": { fr: "Rebut", ar: "نفاية" },
  "quality.rejectedUnits": { fr: "Unités rebutées", ar: "الوحدات المرفوضة" },
  "quality.unaccounted": { fr: "Inconnues / non justifiées", ar: "مجهولة / غير مبرَّرة" },
  "quality.unclassified": { fr: "« Non classé »", ar: "«غير مصنّف»" },
  "quality.firstHint": {
    fr: "Conforme au standard de l'usine, vendable",
    ar: "مطابق لمعيار المصنع، قابل للبيع",
  },
  "quality.secondHint": {
    fr: "Sous le standard, vendable en qualité inférieure",
    ar: "دون المعيار، يُباع بجودة أدنى",
  },
  "quality.rejectHint": { fr: "Invendables — comptées comme déchets", ar: "غير قابلة للبيع — تُحتسب نفايات" },
  "quality.unaccountedHint": {
    fr: "Unités en stock qu'aucun enregistrement de production n'explique",
    ar: "وحدات في المخزون لا يفسّرها أي تسجيل إنتاج",
  },
  "quality.allAccounted": { fr: "Toutes les unités sont justifiées", ar: "كل الوحدات مبرَّرة" },
  "quality.classLabel": { fr: "Classe de qualité", ar: "صنف الجودة" },
  "quality.classHint": {
    fr: "Comment ces unités sont classées à leur sortie de production",
    ar: "كيف تُصنَّف هذه الوحدات عند خروجها من الإنتاج",
  },

  // -------------------------------------------------------- criticality
  "criticality.high": { fr: "Haute", ar: "عالية" },
  "criticality.medium": { fr: "Moyenne", ar: "متوسطة" },
  "criticality.low": { fr: "Basse", ar: "منخفضة" },

  // ------------------------------------------------------------ add / edit
  "item.addTitle": { fr: "Ajouter l'article", ar: "إضافة المادة" },
  "item.unspecifiedM": { fr: "« Non précisé »", ar: "«غير محدَّد»" },
  "item.unspecifiedF": { fr: "« Non précisée »", ar: "«غير محدَّدة»" },
  "item.genderM": { fr: "M (Homme)", ar: "ذ (رجل)" },
  "item.genderF": { fr: "F (Femme)", ar: "أ (امرأة)" },
  "item.unitHint": {
    fr: "Ce en quoi l'article se compte — la quantité et le coût s'expriment par unité",
    ar: "ما تُعدّ به المادة — الكمية والتكلفة تُعبَّر عنهما بالوحدة",
  },
  "item.unitInvalid": {
    fr: "Choisissez une unité de mesure (kg, litre, pièce…). Un nombre n'est pas une unité.",
    ar: "اختر وحدة قياس (كغ، لتر، قطعة…). العدد ليس وحدة.",
  },
  "item.thresholdLabel": { fr: "Seuil de réapprovisionnement", ar: "عتبة التموين" },
  "item.thresholdHint": {
    fr: "Alerte quand le stock descend à ce niveau ou en dessous",
    ar: "تنبيه عندما ينزل المخزون إلى هذا المستوى أو دونه",
  },
  "item.salePriceLabel": { fr: "Prix de vente (DZD)", ar: "سعر البيع (دج)" },
  "item.salePriceHint": {
    fr: "Ce à quoi l'article est vendu — distinct du coût unitaire ci-dessus",
    ar: "ما تُباع به المادة — يختلف عن تكلفة الوحدة أعلاه",
  },
  "item.photoLabel": { fr: "Photo", ar: "صورة" },
  "item.photoHint": { fr: "Facultatif.", ar: "اختياري." },
  "item.existingStock": { fr: "Stock déjà en place", ar: "مخزون موجود مسبقًا" },
  "item.existingStockHint": {
    fr: "Ce stock initial est enregistré comme une {reception}",
    ar: "يُسجَّل هذا المخزون الأولي بوصفه {reception}",
  },
  "item.reception": { fr: "réception", ar: "استلامًا" },
  "item.initialDateHint": { fr: "Date à laquelle ce stock est constaté", ar: "التاريخ الذي عُوين فيه هذا المخزون" },
  "item.initialLotHint": {
    fr: "Indiquez le numéro de lot de ce stock initial — cet inventaire est suivi par lot.",
    ar: "اذكر رقم دفعة هذا المخزون الأولي — هذا المخزون متابَع بالدفعات.",
  },
  "item.initialExpiryHint": {
    fr: "Indiquez la date de péremption de ce stock initial.",
    ar: "اذكر تاريخ صلاحية هذا المخزون الأولي.",
  },
  "item.machineSectionShort": { fr: "Machine & compatibilité", ar: "الآلة والتوافق" },
  "item.criticalityHint": {
    fr: "Impact d'une rupture de stock sur la production",
    ar: "أثر انقطاع المخزون على الإنتاج",
  },
  "item.compatibilityHint": { fr: "Usage, remplaçabilité — informatif", ar: "الاستعمال والاستبدال — للعلم" },

  "item.err.nameReference": { fr: "Le nom et la référence sont obligatoires.", ar: "الاسم والمرجع إلزاميان." },
  "item.err.threshold": {
    fr: "Le seuil de réapprovisionnement doit être un nombre positif.",
    ar: "يجب أن تكون عتبة التموين عددًا موجبًا.",
  },
  "item.err.price": { fr: "Le prix doit être un nombre positif (DZD).", ar: "يجب أن يكون السعر عددًا موجبًا (دج)." },
  "item.err.unitCost": {
    fr: "Le coût unitaire doit être un nombre positif (DZD).",
    ar: "يجب أن تكون تكلفة الوحدة عددًا موجبًا (دج).",
  },
  "item.err.initialQuantity": {
    fr: "La quantité initiale doit être un nombre positif.",
    ar: "يجب أن تكون الكمية الأولية عددًا موجبًا.",
  },

  "item.ph.reference": { fr: "Ex. CH-004", ar: "مثال: CH-004" },
  "item.ph.threshold": { fr: "Ex. 100", ar: "مثال: 100" },
  "item.ph.price": { fr: "Ex. 4500", ar: "مثال: 4500" },
  "item.ph.unitCost": { fr: "Ex. 1200", ar: "مثال: 1200" },
  "item.ph.lot": { fr: "Ex. L-2501", ar: "مثال: L-2501" },
  "item.ph.color": { fr: "Ex. Noir", ar: "مثال: أسود" },
  "item.ph.size": { fr: "Ex. 42", ar: "مثال: 42" },
  "item.ph.machine": { fr: "Ex. Machine à coudre N°3", ar: "مثال: آلة خياطة رقم 3" },
  "item.ph.compatibility": { fr: "Ex. Piqueuses Adler", ar: "مثال: خيّاطات Adler" },
  "item.ph.manufacturer": { fr: "Ex. SKF", ar: "مثال: SKF" },
  "item.ph.location": { fr: "Ex. Atelier — armoire B2", ar: "مثال: الورشة — خزانة B2" },

  // ------------------------------------------------------------- reception
  "receive.title": { fr: "Enregistrer la réception", ar: "تسجيل الاستلام" },
  "receive.date": { fr: "Date de réception", ar: "تاريخ الاستلام" },
  "receive.noSupplier": {
    fr: "Aucun fournisseur enregistré — ajoutez-en un dans l'onglet Fournisseurs",
    ar: "لا يوجد مورّد مسجّل — أضف واحدًا في تبويب الموردين",
  },
  "receive.err.quantity": {
    fr: "La quantité doit être un nombre supérieur à zéro.",
    ar: "يجب أن تكون الكمية عددًا أكبر من الصفر.",
  },
  "receive.err.date": { fr: "La date est obligatoire.", ar: "التاريخ إلزامي." },
  "receive.err.lotRequired": {
    fr: "Le numéro de lot est obligatoire pour ce type de produit.",
    ar: "رقم الدفعة إلزامي لهذا النوع من المنتجات.",
  },
  "receive.err.expiryRequired": {
    fr: "La date de péremption est obligatoire pour ce type de produit.",
    ar: "تاريخ الصلاحية إلزامي لهذا النوع من المنتجات.",
  },

  // ----------------------------------------------------------------- usage
  "usage.title": { fr: "Enregistrer la sortie", ar: "تسجيل الإخراج" },
  "usage.lotToUse": { fr: "Lot à utiliser", ar: "الدفعة المستعملة" },
  "usage.lotHint": {
    fr: "Priorité au lot qui expire le plus tôt (FEFO) ; à défaut, le plus ancien (FIFO)",
    ar: "الأولوية للدفعة الأقرب انتهاءً (FEFO)؛ وإلا فالأقدم (FIFO)",
  },
  "usage.loadingLots": { fr: "Chargement des lots…", ar: "جارٍ تحميل الدفعات…" },
  "usage.loadLotsFailed": { fr: "Impossible de charger les lots.", ar: "تعذّر تحميل الدفعات." },
  "usage.noLots": {
    fr: "Aucun lot disponible pour cet article — il n'y a rien à sortir.",
    ar: "لا توجد دفعة متاحة لهذه المادة — لا شيء لإخراجه.",
  },
  "usage.err.chooseLot": { fr: "Choisissez un lot.", ar: "اختر دفعة." },
  "usage.lotExpired": { fr: "Ce lot est périmé", ar: "هذه الدفعة منتهية الصلاحية" },
  "usage.lotExpiringSoon": { fr: "Ce lot expire bientôt", ar: "هذه الدفعة تنتهي قريبًا" },
  "usage.adjustment": { fr: "Ajustement d'inventaire", ar: "تسوية جرد" },
  "usage.specify": { fr: "Préciser", ar: "توضيح" },
  "usage.maintenanceSection": { fr: "Détails maintenance", ar: "تفاصيل الصيانة" },
  "usage.machineConcerned": { fr: "Machine concernée", ar: "الآلة المعنيّة" },
  "usage.maintenanceRef": { fr: "Référence maintenance", ar: "مرجع الصيانة" },
  "usage.ph.maintenanceRef": { fr: "Ex. MT-2026-021", ar: "مثال: MT-2026-021" },
  "usage.operator": { fr: "Employé / intervenant", ar: "الموظف / المتدخّل" },
  "usage.ph.notes": { fr: "Panne constatée, pièce remplacée…", ar: "العطل المعاين، القطعة المستبدلة…" },
  "usage.qualityHint": {
    fr: "Si ces sorties concernent une classe précise (1er choix, 2ème choix, rebut)",
    ar: "إذا كانت هذه المخرجات تخصّ صنفًا محدّدًا (اختيار أول، اختيار ثانٍ، نفاية)",
  },

  // ------------------------------------------------------ supplier orders
  "so.title": { fr: "Commandes fournisseurs", ar: "طلبات الموردين" },
  "so.new": { fr: "+ Nouvelle commande", ar: "+ طلب جديد" },
  "so.newTitle": { fr: "Nouvelle commande fournisseur", ar: "طلب مورّد جديد" },
  "so.loading": { fr: "Chargement des commandes…", ar: "جارٍ تحميل الطلبات…" },
  "so.loadFailed": { fr: "Impossible de charger les commandes.", ar: "تعذّر تحميل الطلبات." },
  "so.none": { fr: "Aucune commande fournisseur pour le moment.", ar: "لا توجد طلبات موردين حاليًا." },
  "so.noSupplier": {
    fr: "Aucun fournisseur enregistré — ajoutez-en un dans l'onglet Fournisseurs.",
    ar: "لا يوجد مورّد مسجّل — أضف واحدًا في تبويب الموردين.",
  },
  "so.receiveExplains": {
    fr: "Réceptionner une commande fait entrer le stock en inventaire (mouvements IN).",
    ar: "استلام طلب يُدخل المخزون إلى الجرد (حركات دخول).",
  },
  "so.pending": { fr: "En cours", ar: "قيد التنفيذ" },
  "so.received": { fr: "Reçue", ar: "مستلَمة" },
  "so.receive": { fr: "Réceptionner la livraison", ar: "استلام التسليم" },
  "so.receiving": { fr: "Réception…", ar: "جارٍ الاستلام…" },
  "so.orderDate": { fr: "Date de commande", ar: "تاريخ الطلب" },
  "so.lines": { fr: "Lignes de commande", ar: "سطور الطلب" },
  "so.addLine": { fr: "+ Ajouter une ligne", ar: "+ إضافة سطر" },
  "so.save": { fr: "Enregistrer la commande", ar: "حفظ الطلب" },
  "so.chooseItem": { fr: "« Choisir un article »", ar: "«اختر مادة»" },
  "so.choose": { fr: "« Choisir »", ar: "«اختر»" },
  "so.qtyShort": { fr: "Qté", ar: "الكمية" },
  "so.priceShort": { fr: "Prix / u.", ar: "السعر / و." },
  "so.removeShort": { fr: "Suppr.", ar: "حذف" },
  "so.priceHint": {
    fr: "Prix unitaire convenu (DZD). Laissez vide pour utiliser le coût standard de l'article.",
    ar: "سعر الوحدة المتفق عليه (دج). اتركه فارغًا لاستعمال التكلفة المعيارية للمادة.",
  },
  "so.notesHint": {
    fr: "Facultatif — ex. délai, numéro de bon de commande",
    ar: "اختياري — مثلًا: الأجل، رقم سند الطلب",
  },
  "so.err.supplier": { fr: "Le fournisseur est obligatoire.", ar: "المورّد إلزامي." },
  "so.err.date": { fr: "La date de commande est obligatoire.", ar: "تاريخ الطلب إلزامي." },
  "so.err.lines": {
    fr: "Ajoutez au moins une ligne avec une quantité supérieure à zéro.",
    ar: "أضف سطرًا واحدًا على الأقل بكمية أكبر من الصفر.",
  },
  "so.lotSection": {
    fr: "Infos lots (obligatoires pour les produits suivis par lot)",
    ar: "معلومات الدفعات (إلزامية للمنتجات المتابَعة بالدفعات)",
  },
  "so.receiveExplainsFull": {
    fr: "Le stock entre en inventaire (mouvements IN) et la commande passe au statut « Reçue ». La réception est totale.",
    ar: "يدخل المخزون إلى الجرد (حركات دخول) وينتقل الطلب إلى حالة «مستلَمة». الاستلام كلّي.",
  },
  "so.ph.lot": { fr: "Ex. L-2420", ar: "مثال: L-2420" },

  // ------------------------------------------------------ inventory types
  "inv.newTitle": { fr: "Nouvel inventaire", ar: "مخزون جديد" },
  "inv.create": { fr: "Créer l'inventaire", ar: "إنشاء المخزون" },
  "inv.tabName": { fr: "Nom (onglet)", ar: "الاسم (التبويب)" },
  "inv.ph.tabName": { fr: "Ex. Emballages", ar: "مثال: تغليف" },
  "inv.singular": { fr: "Au singulier", ar: "بالمفرد" },
  "inv.ph.singular": { fr: "Ex. emballage", ar: "مثال: تغليفة" },
  "inv.singularHint": {
    fr: "Utilisé dans les phrases de l'écran : « Aucun emballage enregistré »",
    ar: "يُستعمل في جمل الشاشة: «لا توجد تغليفة مسجّلة»",
  },
  "inv.singularRequired": {
    fr: "Indiquez le nom au singulier — il sert dans les messages de l'écran.",
    ar: "اذكر الاسم بالمفرد — يُستعمل في رسائل الشاشة.",
  },
  "inv.tabNameAr": { fr: "Nom (onglet) — arabe", ar: "الاسم (التبويب) — عربي" },
  "inv.ph.tabNameAr": { fr: "مثال: تغليف", ar: "مثال: تغليف" },
  "inv.singularAr": { fr: "Au singulier — arabe", ar: "بالمفرد — عربي" },
  "inv.ph.singularAr": { fr: "مثال: تغليفة", ar: "مثال: تغليفة" },
  "inv.descriptionAr": { fr: "Description libre — arabe", ar: "وصف حرّ — عربي" },
  "inv.ph.descriptionAr": {
    fr: "مثال: كراتين ومواد تغليف. بلا صلاحية وبلا دفعات.",
    ar: "مثال: كراتين ومواد تغليف. بلا صلاحية وبلا دفعات.",
  },
  "inv.arHint": {
    fr: "Facultatif — le français est affiché si vide.",
    ar: "اختياري — يُعرض النص الفرنسي إذا تُرك فارغًا.",
  },
  "inv.key": { fr: "Clé technique", ar: "المفتاح التقني" },
  "inv.keyHint": {
    fr: "Générée à partir du nom. Définitive une fois créée.",
    ar: "تُولَّد من الاسم. نهائية بعد الإنشاء.",
  },
  "inv.description": { fr: "Description libre", ar: "وصف حرّ" },
  "inv.descriptionHint": {
    fr: "Une phrase expliquant ce que contient cet inventaire — affichée sous l'onglet",
    ar: "جملة تشرح ما يحتويه هذا المخزون — تُعرض تحت التبويب",
  },
  "inv.ph.description": {
    fr: "Ex. Cartons et emballages de conditionnement. Pas de péremption, pas de lots.",
    ar: "مثال: كراتين ومواد تغليف. بلا صلاحية وبلا دفعات.",
  },
  "inv.defaultUnit": { fr: "Unité par défaut", ar: "الوحدة الافتراضية" },
  "inv.defaultUnitHint": {
    fr: "Proposée à chaque nouvel article de cet inventaire",
    ar: "تُقترح على كل مادة جديدة في هذا المخزون",
  },
  "inv.tracks": { fr: "Ce que cet inventaire suit", ar: "ما يتابعه هذا المخزون" },
  "inv.opt.batches": { fr: "Suivi par lot", ar: "متابعة بالدفعات" },
  "inv.opt.batchesHint": {
    fr: "Chaque réception crée un lot numéroté, consommé en FIFO.",
    ar: "كل استلام يُنشئ دفعة مرقّمة، تُستهلك بنظام FIFO.",
  },
  "inv.opt.expiry": { fr: "Péremption", ar: "الصلاحية" },
  "inv.opt.expiryHint": {
    fr: "Chaque lot porte une date d'expiration ; la consommation passe en FEFO.",
    ar: "كل دفعة تحمل تاريخ انتهاء؛ ويصير الاستهلاك بنظام FEFO.",
  },
  "inv.opt.productionInput": { fr: "Matière de production", ar: "مادة إنتاج" },
  "inv.opt.productionInputHint": {
    fr: "Utilisable comme matière première dans un lot de production.",
    ar: "قابلة للاستعمال كمادة أولية في دفعة إنتاج.",
  },
  "inv.opt.quality": { fr: "Qualité de production", ar: "جودة الإنتاج" },
  "inv.opt.qualityHint": {
    fr: "Classement 1er / 2ème choix / rebut, avec réconciliation des unités inconnues.",
    ar: "تصنيف اختيار أول / ثانٍ / نفاية، مع مطابقة الوحدات المجهولة.",
  },
  "inv.opt.machineInfo": { fr: "Infos machine", ar: "معلومات الآلة" },
  "inv.opt.machineInfoHint": {
    fr: "Machine, compatibilité, fabricant, localisation, criticité.",
    ar: "الآلة، التوافق، الصانع، الموقع، الحرجية.",
  },
  "inv.opt.description": { fr: "Description libre", ar: "وصف حرّ" },
  "inv.opt.descriptionHint": { fr: "Champ texte : usage, remplaçabilité", ar: "حقل نصّي: الاستعمال، قابلية الاستبدال" },
  "inv.opt.color": { fr: "Couleur", ar: "اللون" },
  "inv.opt.colorHint": { fr: "Variante couleur sur chaque article.", ar: "متغيّر اللون على كل مادة." },
  "inv.opt.size": { fr: "Taille", ar: "المقاس" },
  "inv.opt.sizeHint": { fr: "Variante taille ou pointure.", ar: "متغيّر المقاس." },
  "inv.opt.gender": { fr: "Sexe", ar: "الجنس" },
  "inv.opt.genderHint": { fr: "Variante homme / femme.", ar: "متغيّر رجالي / نسائي." },
  "inv.opt.price": { fr: "Prix de vente", ar: "سعر البيع" },
  "inv.opt.priceHint": {
    fr: "Prix auquel l'article est vendu — distinct de son coût d'achat.",
    ar: "السعر الذي تُباع به المادة — يختلف عن تكلفة شرائها.",
  },
  "inv.costAlwaysTracked": {
    fr: "Le coût unitaire et la valeur du stock sont suivis pour tous les inventaires — il n'y a pas d'option à activer pour cela.",
    ar: "تُتابَع تكلفة الوحدة وقيمة المخزون في كل المخزونات — لا يوجد خيار لتفعيل ذلك.",
  },
  "inv.err.name": { fr: "Le nom de l'inventaire est obligatoire.", ar: "اسم المخزون إلزامي." },
  "inv.deleteWarning": {
    fr: "Définitive — tout ce que contient cet inventaire y renvoie.",
    ar: "نهائي — كل ما يحتويه هذا المخزون مرتبط به.",
  },

  // ------------------------------------------------------------ stock page
  "stock.confirmDeleteItem": {
    fr: "Supprimer définitivement « {name} » ? Cet article n'a aucun historique, la suppression est donc sans effet sur le stock.",
    ar: "حذف «{name}» نهائيًا؟ هذه المادة بلا سجلّ، فالحذف لا أثر له على المخزون.",
  },
  "stock.confirmDeleteType": {
    fr: "Supprimer l'inventaire « {label} » ? Cette action n'est possible que s'il ne contient aucun article.",
    ar: "حذف المخزون «{label}»؟ لا يمكن ذلك إلا إذا كان لا يحتوي أي مادة.",
  },
  "stock.emptyTitle": { fr: "Aucun {singular} enregistré", ar: "لا توجد {singular} مسجّلة" },
  "stock.emptyDesc": {
    fr: "Ajoutez le premier article de « {label} » pour commencer à suivre le stock.",
    ar: "أضف أول مادة في «{label}» لبدء متابعة المخزون.",
  },
  "stock.viewDetails": { fr: "Voir les détails", ar: "عرض التفاصيل" },
  "stock.receive": { fr: "Réception", ar: "استلام" },
  "stock.issue": { fr: "Sortie", ar: "إخراج" },
  "stock.reorderAction": { fr: "Réapprovisionner", ar: "تموين" },
  "stock.reorderTitle": { fr: "Seuil de réapprovisionnement : {quantity}", ar: "عتبة التموين: {quantity}" },
  "stock.partial": { fr: "partiel", ar: "جزئي" },
  "stock.partialTitle": {
    fr: "{quantity} sont entrés sans prix connu — la valeur ci-dessus ne les compte pas.",
    ar: "{quantity} دخلت بدون سعر معروف — القيمة أعلاه لا تحتسبها.",
  },
  "stock.producedCostHint": {
    fr: "Coût matières premières par unité, moyenne des lots de production qui l'ont fabriqué. Hors main-d'œuvre, énergie et frais généraux.",
    ar: "تكلفة المواد الأولية للوحدة، متوسط دفعات الإنتاج التي صنعتها. دون يد عاملة ولا طاقة ولا مصاريف عامة.",
  },
  "stock.finishedGoodsWarning": {
    fr: "Le coût affiché ici est un {lead} : il ne comprend que les matières premières consommées par les lots de production qui ont fabriqué ces articles. Main-d'œuvre, énergie, amortissement des machines et frais généraux n'y sont pas — le coût de revient réel est plus élevé.",
    ar: "التكلفة المعروضة هنا هي {lead}: لا تشمل سوى المواد الأولية التي استهلكتها دفعات الإنتاج التي صنعت هذه المواد. اليد العاملة والطاقة واهتلاك الآلات والمصاريف العامة ليست ضمنها — سعر التكلفة الحقيقي أعلى.",
  },
  "stock.createdButStockFailed": {
    fr: "« {name} » a bien été créé, mais sa quantité initiale n'a pas pu être enregistrée : {reason} Utilisez le bouton « Réception » sur sa ligne.",
    ar: "أُنشئت «{name}» بنجاح، لكن تعذّر تسجيل كميتها الأولية: {reason} استعمل زرّ «استلام» في سطرها.",
  },
  "stock.unknownError": { fr: "erreur inconnue", ar: "خطأ غير معروف" },
  "quality.firstShort": { fr: "1er {count}", ar: "أول {count}" },
  "quality.secondShortCount": { fr: "2e {count}", ar: "ثانٍ {count}" },
  "quality.rejectShortCount": { fr: "rebut {count}", ar: "نفاية {count}" },

  // --------------------------------------------------------------- plurals
  "stock.lowStock.one": { fr: "{count} article en stock faible", ar: "مادة واحدة بمخزون منخفض" },
  "stock.lowStock.two": { fr: "{count} articles en stock faible", ar: "مادتان بمخزون منخفض" },
  "stock.lowStock.few": { fr: "{count} articles en stock faible", ar: "{count} مواد بمخزون منخفض" },
  "stock.lowStock.other": { fr: "{count} articles en stock faible", ar: "{count} مادة بمخزون منخفض" },
  "stock.watchBatch.one": {
    fr: "{count} lot de produits chimiques à surveiller",
    ar: "دفعة مواد كيميائية واحدة تحتاج مراقبة",
  },
  "stock.watchBatch.two": {
    fr: "{count} lots de produits chimiques à surveiller",
    ar: "دفعتا مواد كيميائية تحتاجان مراقبة",
  },
  "stock.watchBatch.few": {
    fr: "{count} lots de produits chimiques à surveiller",
    ar: "{count} دفعات مواد كيميائية تحتاج مراقبة",
  },
  "stock.watchBatch.other": {
    fr: "{count} lots de produits chimiques à surveiller",
    ar: "{count} دفعة مواد كيميائية تحتاج مراقبة",
  },
  "stock.unpricedItems.one": {
    fr: "{count} article en stock sans coût connu — non compté ici",
    ar: "مادة واحدة في المخزون بلا تكلفة معروفة — غير محتسَبة هنا",
  },
  "stock.unpricedItems.two": {
    fr: "{count} articles en stock sans coût connu — non comptés ici",
    ar: "مادتان في المخزون بلا تكلفة معروفة — غير محتسَبتين هنا",
  },
  "stock.unpricedItems.few": {
    fr: "{count} articles en stock sans coût connu — non comptés ici",
    ar: "{count} مواد في المخزون بلا تكلفة معروفة — غير محتسَبة هنا",
  },
  "stock.unpricedItems.other": {
    fr: "{count} articles en stock sans coût connu — non comptés ici",
    ar: "{count} مادة في المخزون بلا تكلفة معروفة — غير محتسَبة هنا",
  },
  "stock.unknownUnits.one": { fr: "{count} inconnue", ar: "وحدة مجهولة" },
  "stock.unknownUnits.two": { fr: "{count} inconnues", ar: "وحدتان مجهولتان" },
  "stock.unknownUnits.few": { fr: "{count} inconnues", ar: "{count} وحدات مجهولة" },
  "stock.unknownUnits.other": { fr: "{count} inconnues", ar: "{count} وحدة مجهولة" },

  // -------------------------------------------------- reception modal extras
  "receive.modalTitle": { fr: "Réception — {item}", ar: "استلام — {item}" },
  "receive.quantityLabel": { fr: "Quantité reçue ({unit})", ar: "الكمية المستلَمة ({unit})" },
  "receive.unitCostLabel": { fr: "Coût unitaire (DZD / {unit})", ar: "تكلفة الوحدة (دج / {unit})" },
  "receive.unitCostPrefilled": {
    fr: "Pré-rempli avec le coût standard de l'article. Corrigez-le si cette livraison a été payée à un autre prix — c'est ce montant qui entre dans la valeur du stock.",
    ar: "مملوء مسبقًا بالتكلفة المعيارية للمادة. صحّحه إذا دُفع ثمن هذا التسليم بسعر آخر — هذا المبلغ هو الذي يدخل في قيمة المخزون.",
  },
  "receive.unitCostUnknown": {
    fr: "Ce que cette livraison coûte par unité. Laissez vide si le prix n'est pas connu — l'entrée restera visiblement non valorisée.",
    ar: "ما يكلّفه هذا التسليم للوحدة. اتركه فارغًا إن كان السعر مجهولًا — سيبقى الإدخال غير مُقيَّم بشكل ظاهر.",
  },
  "receive.lineValue": { fr: "Valeur de la réception : {value}", ar: "قيمة الاستلام: {value}" },
  "receive.unspecified": { fr: "— Non précisé —", ar: "— غير محدَّد —" },
  "receive.unclassified": { fr: "— Non classé —", ar: "— غير مصنّف —" },

  // -------------------------------------------------- supplier order extras
  "so.openCount.one": { fr: "{count} commande en cours", ar: "طلب واحد قيد التنفيذ" },
  "so.openCount.two": { fr: "{count} commandes en cours", ar: "طلبان قيد التنفيذ" },
  "so.openCount.few": { fr: "{count} commandes en cours", ar: "{count} طلبات قيد التنفيذ" },
  "so.openCount.other": { fr: "{count} commandes en cours", ar: "{count} طلبًا قيد التنفيذ" },
  "so.orderedOn": { fr: "· commande du {date}", ar: "· طلب بتاريخ {date}" },
  "so.receivedOn": { fr: "Réceptionnée le {date}", ar: "استُلمت في {date}" },
  "so.receiveTitle": { fr: "Réceptionner la commande — {supplier}", ar: "استلام الطلب — {supplier}" },
  "so.orderOf": { fr: "Commande du {date}", ar: "طلب بتاريخ {date}" },
  "so.err.lotFor": {
    fr: "Le numéro de lot est obligatoire pour « {item} ».",
    ar: "رقم الدفعة إلزامي لـ«{item}».",
  },
  "so.err.expiryFor": {
    fr: "La date de péremption est obligatoire pour « {item} ».",
    ar: "تاريخ الصلاحية إلزامي لـ«{item}».",
  },

  "so.orderTotal": { fr: "Total commande : {value}", ar: "مجموع الطلب: {value}" },
  "so.priceFollowsGoods": {
    fr: "Le prix unitaire saisi ici suit la marchandise : à la réception, il entre dans la valeur du stock et met à jour le coût moyen de l'article. Laissé vide, c'est le coût standard de l'article qui s'applique.",
    ar: "سعر الوحدة المُدخَل هنا يتبع البضاعة: عند الاستلام يدخل في قيمة المخزون ويحدّث التكلفة المتوسطة للمادة. وإذا تُرك فارغًا، تُطبَّق التكلفة المعيارية للمادة.",
  },

  // ------------------------------------------------------------ item form
  "item.editTitle": { fr: "Modifier — {name}", ar: "تعديل — {name}" },
  "item.newTitle": { fr: "Nouvel article — {inventory}", ar: "مادة جديدة — {inventory}" },
  "item.namePlaceholder": { fr: "Ex. {singular}", ar: "مثال: {singular}" },
  "item.unitCostLabel": { fr: "Coût unitaire (DZD / {unit})", ar: "تكلفة الوحدة (دج / {unit})" },
  "item.unitCostHint": {
    fr: "Ce que coûte une unité à l'achat. Sert de valeur par défaut aux réceptions et à valoriser le stock : la valeur affichée est la moyenne de ce qui a réellement été payé.",
    ar: "ما تكلّفه الوحدة عند الشراء. يُستعمل كقيمة افتراضية للاستلامات ولتقييم المخزون: القيمة المعروضة هي متوسط ما دُفع فعلًا.",
  },
  "item.unitCostPreview": { fr: "{quantity} en stock — {value}", ar: "{quantity} في المخزون — {value}" },
  "item.descriptionHint": { fr: "Usage, remplaçabilité… — informatif", ar: "الاستعمال، قابلية الاستبدال… — للعلم" },
  "item.initialQuantityLabel": { fr: "Quantité initiale ({unit})", ar: "الكمية الأولية ({unit})" },
  "item.initialQuantityHint": {
    fr: "Ce que vous avez déjà en magasin aujourd'hui. Laissez vide si l'article n'est pas encore approvisionné.",
    ar: "ما لديك فعلًا في المخزن اليوم. اتركه فارغًا إن لم تُموَّن المادة بعد.",
  },
  "item.initialStockNote": {
    fr: "Ce stock initial est enregistré comme une {reception} : {quantity} valorisés à {value}. Pour une livraison avec fournisseur, utilisez le bouton « Réception » de la ligne — la quantité d'un article vient toujours de ses mouvements, jamais d'une case qu'on réécrit.",
    ar: "يُسجَّل هذا المخزون الأولي بوصفه {reception}: {quantity} مُقيَّمة بـ{value}. أما التسليم مع مورّد فاستعمل زرّ «استلام» في السطر — كمية المادة تأتي دائمًا من حركاتها، لا من خانة يُعاد كتابتها.",
  },

  // ------------------------------------------------------------ usage modal
  "usage.modalTitle": { fr: "Sortie — {item}", ar: "إخراج — {item}" },
  "usage.quantityLabel": { fr: "Quantité utilisée ({unit})", ar: "الكمية المستعملة ({unit})" },
  "usage.available": { fr: "Disponible : {quantity}", ar: "المتاح: {quantity}" },
  "usage.batchOption": {
    fr: "{batch} — reçu le {date} · {remaining} restant",
    ar: "{batch} — استُلمت في {date} · {remaining} متبقٍّ",
  },
  "usage.batchPriority": { fr: " (prioritaire)", ar: " (ذات أولوية)" },
  "usage.err.tooMuchBatch": {
    fr: "Il n'y a que {quantity} disponible dans ce lot.",
    ar: "لا يوجد سوى {quantity} متاح في هذه الدفعة.",
  },
  "usage.err.tooMuch": { fr: "Il n'y a que {quantity} disponible.", ar: "لا يوجد سوى {quantity} متاح." },

  // The stored reason codes stay French — they are written to the ledger and
  // read back by every past movement — while their labels translate.
  "reason.sale": { fr: "Vente", ar: "بيع" },
  "reason.production": { fr: "Production", ar: "إنتاج" },
  "reason.maintenance": { fr: "Maintenance", ar: "صيانة" },
  "reason.breakage": { fr: "Casse", ar: "كسر" },
  "reason.expired": { fr: "Périmé", ar: "انتهاء صلاحية" },
  "reason.adjustment": { fr: "Ajustement d'inventaire", ar: "تسوية جرد" },
  "reason.other": { fr: "Autre", ar: "أخرى" },

  "inv.editTitle": { fr: "Modifier l'inventaire — {label}", ar: "تعديل المخزون — {label}" },
  "inv.err.defaultUnit": {
    fr: "Choisissez une unité de mesure par défaut (kg, litre, pièce…). Un nombre n'est pas une unité.",
    ar: "اختر وحدة قياس افتراضية (كغ، لتر، قطعة…). العدد ليس وحدة.",
  },
  "inv.err.key": {
    fr: "La clé ne peut contenir que des minuscules, des chiffres et des tirets (ex. « emballages »).",
    ar: "لا يمكن أن يحتوي المفتاح إلا على حروف لاتينية صغيرة وأرقام وشُرَط (مثال: «emballages»).",
  },

  "unit.group.counting": { fr: "Comptage", ar: "العدّ" },
  "unit.group.mass": { fr: "Masse", ar: "الكتلة" },
  "unit.group.volume": { fr: "Volume", ar: "الحجم" },
  "unit.group.length": { fr: "Longueur", ar: "الطول" },
  "unit.group.area": { fr: "Surface", ar: "المساحة" },
  "unit.other": { fr: "Autre…", ar: "أخرى…" },
  "unit.otherPlaceholder": { fr: "Ex. botte", ar: "مثال: حزمة" },
  "unit.customAria": { fr: "{label} personnalisée", ar: "{label} مخصَّصة" },
  "stock.loadTypesFailed": { fr: "Impossible de charger les types d'inventaire.", ar: "تعذّر تحميل أنواع المخزون." },
});
