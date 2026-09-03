import { catalogue } from "./catalogue";

/**
 * Production: batches, material consumption, output declaration, and the
 * variance between what the machine announced and what was counted.
 *
 * The vocabulary here is deliberately non-accusatory and must stay that way
 * in every language — that was the factory's own request. « Non comptabilisé »
 * is غير محتسَب ("not accounted for"), never مسروق ("stolen"); an
 * « investigation » is تحقّق (a verification), not تحقيق (an inquest into
 * someone). A gap gets attention without the record blaming a person for it.
 */
export const production = catalogue({
  // ------------------------------------------------------------------- page
  "prod.loadFailed": { fr: "Impossible de charger la production.", ar: "تعذّر تحميل الإنتاج." },
  "prod.loading": { fr: "Chargement de la production…", ar: "جارٍ تحميل الإنتاج…" },
  "prod.tabBatches": { fr: "Lots de production", ar: "دفعات الإنتاج" },
  "prod.tabLosses": { fr: "Pertes & rendement", ar: "الخسائر والمردود" },
  "prod.newBatch": { fr: "+ Nouveau lot", ar: "+ دفعة جديدة" },
  "prod.needFinishedGood": {
    fr: "Ajoutez d'abord un produit fini dans l'onglet Stock — c'est ce qu'un lot de production fabrique.",
    ar: "أضف منتجًا نهائيًا أولًا في تبويب المخزون — فهو ما تصنعه دفعة الإنتاج.",
  },
  "prod.investigationBanner": {
    fr: "{count} non expliqué entre la quantité annoncée par la machine et la sortie comptabilisée. Ouvrez le lot pour enregistrer ce que la vérification a établi.",
    ar: "{count} غير مفسَّر بين الكمية التي أعلنتها الآلة والمخرَج المحتسَب. افتح الدفعة لتسجيل ما أثبته التحقّق.",
  },
  "prod.gapCount.one": { fr: "1 lot présente un écart", ar: "دفعة واحدة بها فارق" },
  "prod.gapCount.two": { fr: "{count} lots présentent un écart", ar: "دفعتان بهما فارق" },
  "prod.gapCount.few": { fr: "{count} lots présentent un écart", ar: "{count} دفعات بها فارق" },
  "prod.gapCount.other": { fr: "{count} lots présentent un écart", ar: "{count} دفعة بها فارق" },

  // ---------------------------------------------------------------- statuses
  "prodStatus.PLANNED": { fr: "Planifié", ar: "مبرمَج" },
  "prodStatus.IN_PROGRESS": { fr: "En cours", ar: "قيد التنفيذ" },
  "prodStatus.COMPLETED": { fr: "Terminé", ar: "منتهٍ" },
  "prodStatus.INVESTIGATION": { fr: "Investigation requise", ar: "يتطلّب تحقّقًا" },
  "prodStatus.CLOSED": { fr: "Écart justifié", ar: "فارق مبرَّر" },
  "prodStatus.CANCELLED": { fr: "Annulé", ar: "ملغى" },

  // -------------------------------------------------------------- monitoring
  "prod.filter.product": { fr: "Produit", ar: "المنتج" },
  "prod.filter.machine": { fr: "Machine", ar: "الآلة" },
  "prod.filter.supervisor": { fr: "Superviseur", ar: "المشرف" },
  "prod.noBatchMatch": { fr: "Aucun lot ne correspond à ces filtres", ar: "لا توجد دفعة تطابق هذه المرشّحات" },
  "prod.noBatches": { fr: "Aucun lot de production", ar: "لا توجد دفعات إنتاج" },
  "prod.widenPeriod": {
    fr: "Élargissez la période ou réinitialisez les filtres.",
    ar: "وسّع الفترة أو أعد تعيين المرشّحات.",
  },
  "prod.createFirst": {
    fr: "Créez un lot pour commencer à suivre la production.",
    ar: "أنشئ دفعة لبدء متابعة الإنتاج.",
  },
  "prod.col.batch": { fr: "Lot", ar: "الدفعة" },
  "prod.col.expected": { fr: "Attendu", ar: "المتوقَّع" },
  "prod.col.accounted": { fr: "Comptabilisé", ar: "المحتسَب" },
  "prod.col.first": { fr: "1er", ar: "الأول" },
  "prod.col.second": { fr: "2ème", ar: "الثاني" },
  "prod.col.waste": { fr: "Rebut", ar: "النفاية" },
  "prod.col.unknown": { fr: "Non comptabilisé", ar: "غير محتسَب" },

  // ---------------------------------------------------------------- variance
  "prod.outputNotDeclared": { fr: "Sortie non déclarée", ar: "لم يُصرَّح بالمخرَج" },
  "prod.fullyAccounted": { fr: "Entièrement justifié", ar: "مبرَّر بالكامل" },
  "prod.unaccountedCount": { fr: "{count} non comptabilisées", ar: "{count} غير محتسَبة" },
  "prod.surplusCount": { fr: "{count} en excédent", ar: "{count} فائضة" },
  "prod.expectedMachine": { fr: "Attendu (machine)", ar: "المتوقَّع (الآلة)" },

  // ------------------------------------------------------------------ losses
  "prod.noOutputPeriod": {
    fr: "Aucune sortie déclarée sur cette période",
    ar: "لم يُصرَّح بأي مخرَج في هذه الفترة",
  },
  "prod.noOutputPeriodDesc": {
    fr: "Les pertes et le rendement se calculent à partir des lots dont la sortie a été déclarée.",
    ar: "تُحسب الخسائر والمردود انطلاقًا من الدفعات التي صُرِّح بمخرجها.",
  },
  "prod.yieldRate": { fr: "Rendement (1er choix)", ar: "المردود (اختيار أول)" },
  "prod.secondRate": { fr: "Taux 2ème choix", ar: "نسبة الاختيار الثاني" },
  "prod.wasteRate": { fr: "Taux de rebut", ar: "نسبة النفاية" },
  "prod.unknownRate": { fr: "Taux non comptabilisé", ar: "نسبة غير المحتسَب" },
  "prod.units": { fr: "{count} unités", ar: "{count} وحدة" },
  "prod.unitsOfExpected": {
    fr: "{count} unités sur {expected} attendues",
    ar: "{count} وحدة من أصل {expected} متوقَّعة",
  },
  "prod.batchesCounted": { fr: "Lots comptés", ar: "الدفعات المحتسَبة" },
  "prod.outputDeclared": { fr: "Sortie déclarée", ar: "المخرَج مُصرَّح به" },
  "prod.batchesRunning": { fr: "Lots en cours", ar: "الدفعات الجارية" },
  "prod.outputNotYet": { fr: "Sortie pas encore déclarée", ar: "لم يُصرَّح بالمخرَج بعد" },
  "prod.openInvestigations": { fr: "Investigations ouvertes", ar: "التحقّقات المفتوحة" },
  "prod.openInvestigationsHint": {
    fr: "Écarts sans explication enregistrée",
    ar: "فوارق بلا تفسير مسجّل",
  },
  "prod.totalAccounted": { fr: "Total comptabilisé", ar: "إجمالي المحتسَب" },
  "prod.ofExpected": { fr: "sur {expected} attendues", ar: "من أصل {expected} متوقَّعة" },
  "prod.lossesByProduct": { fr: "Pertes par produit", ar: "الخسائر حسب المنتج" },
  "prod.lossesByMachine": { fr: "Pertes par machine", ar: "الخسائر حسب الآلة" },
  "prod.lossesByPeriod": { fr: "Pertes par période", ar: "الخسائر حسب الفترة" },
  "prod.groupProduct": { fr: "Produit", ar: "المنتج" },
  "prod.groupMachine": { fr: "Machine", ar: "الآلة" },
  "prod.groupMonth": { fr: "Mois", ar: "الشهر" },
  "prod.col.batches": { fr: "Lots", ar: "الدفعات" },
  "prod.col.yield": { fr: "Rendement", ar: "المردود" },
  "prod.col.wasteRate": { fr: "Taux rebut", ar: "نسبة النفاية" },
  "prod.col.unknownRate": { fr: "Taux non compt.", ar: "نسبة غير المحتسَب" },

  // ---------------------------------------------------------- material lines
  "prod.material": { fr: "Matière", ar: "المادة" },
  "prod.choose": { fr: "— Choisir —", ar: "— اختر —" },
  "prod.materialAvailable": { fr: "{name} ({quantity} disponible)", ar: "{name} ({quantity} متاح)" },
  "prod.lotFefo": { fr: "Lot (FEFO recommandé)", ar: "الدفعة (FEFO موصى بها)" },
  "prod.lotFefoHint": {
    fr: "Priorité au lot qui expire le plus tôt ; sinon le plus ancien (FIFO)",
    ar: "الأولوية للدفعة الأقرب انتهاءً؛ وإلا فالأقدم (FIFO)",
  },
  "prod.noLot": { fr: "Aucun lot disponible", ar: "لا توجد دفعة متاحة" },
  "prod.lotRemaining": { fr: "{batch} · {remaining} restant", ar: "{batch} · {remaining} متبقٍّ" },
  "prod.lotRecommended": { fr: " (recommandé)", ar: " (موصى بها)" },
  "prod.lotExpired": { fr: " · périmé", ar: " · منتهي الصلاحية" },
  "prod.lotExpiringSoon": { fr: " · bientôt périmé", ar: " · قريب الانتهاء" },
  "prod.quantityWithUnit": { fr: "Quantité ({unit})", ar: "الكمية ({unit})" },
  "prod.quantity": { fr: "Quantité", ar: "الكمية" },
  "prod.unitCostFromStock": { fr: "Issu du stock, non modifiable ici", ar: "مأخوذ من المخزون، غير قابل للتعديل هنا" },
  "prod.unitCostUnknown": {
    fr: "Cette matière n'a aucune entrée valorisée — renseignez son coût dans le Stock.",
    ar: "هذه المادة بلا أي إدخال مُقيَّم — أدخل تكلفتها في المخزون.",
  },
  "prod.unitCostAria": { fr: "Coût unitaire issu du stock", ar: "تكلفة الوحدة مأخوذة من المخزون" },
  "prod.lineCost": { fr: "Coût de la ligne", ar: "تكلفة السطر" },
  "prod.lineCostAria": { fr: "Coût de cette matière pour le lot", ar: "تكلفة هذه المادة للدفعة" },
  "prod.removeMaterial": { fr: "Retirer cette matière", ar: "إزالة هذه المادة" },

  // ------------------------------------------------------------------ shifts
  "shift.morning": { fr: "Matin", ar: "صباح" },
  "shift.afternoon": { fr: "Après-midi", ar: "مساء" },
  "shift.night": { fr: "Nuit", ar: "ليل" },

  // --------------------------------------------------------------- new batch
  "prod.newBatchTitle": { fr: "Nouveau lot de production", ar: "دفعة إنتاج جديدة" },
  "prod.create": { fr: "Créer le lot", ar: "إنشاء الدفعة" },
  "prod.product": { fr: "Produit fabriqué", ar: "المنتج المصنوع" },
  "prod.shift": { fr: "Équipe", ar: "الفريق" },
  "prod.operator": { fr: "Opérateur", ar: "المشغِّل" },
  "prod.supervisor": { fr: "Superviseur", ar: "المشرف" },
  "prod.expectedQuantity": { fr: "Quantité attendue (machine)", ar: "الكمية المتوقَّعة (الآلة)" },
  "prod.expectedHint": {
    fr: "Ce que la machine annonce avoir produit — le point de départ de la réconciliation",
    ar: "ما تعلن الآلة أنها أنتجته — نقطة انطلاق المطابقة",
  },
  "prod.materials": { fr: "Matières consommées", ar: "المواد المستهلَكة" },
  "prod.addMaterial": { fr: "+ Ajouter une matière", ar: "+ إضافة مادة" },
  "prod.materialsCost": { fr: "Coût matières du lot", ar: "تكلفة مواد الدفعة" },
  "prod.err.product": { fr: "Choisissez le produit fabriqué.", ar: "اختر المنتج المصنوع." },
  "prod.err.expected": {
    fr: "La quantité attendue doit être un nombre supérieur à zéro.",
    ar: "يجب أن تكون الكمية المتوقَّعة عددًا أكبر من الصفر.",
  },
  "prod.err.machine": { fr: "Indiquez la machine.", ar: "اذكر الآلة." },
  "prod.err.materials": {
    fr: "Ajoutez au moins une matière avec une quantité.",
    ar: "أضف مادة واحدة على الأقل بكمية.",
  },
  "prod.unpricedWarning": {
    fr: "{count} tirée(s) d'un stock sans coût connu : le coût matières affiché est incomplet.",
    ar: "{count} مسحوبة من مخزون بلا تكلفة معروفة: تكلفة المواد المعروضة ناقصة.",
  },
  "prod.materialsLeaveStock": {
    fr: "Créer ce lot sort immédiatement les matières du stock. La sortie produite se déclare ensuite, depuis la fiche du lot.",
    ar: "إنشاء هذه الدفعة يُخرج المواد من المخزون فورًا. أما المخرَج المنتَج فيُصرَّح به لاحقًا، من بطاقة الدفعة.",
  },

  // ------------------------------------------------------------ batch detail
  "prod.batchTitle": { fr: "Lot {code}", ar: "الدفعة {code}" },
  "prod.declareOutput": { fr: "Déclarer la sortie", ar: "التصريح بالمخرَج" },
  "prod.declaredOutput": { fr: "Sortie déclarée", ar: "المخرَج المُصرَّح به" },
  "prod.firstChoiceQty": { fr: "1er choix", ar: "الاختيار الأول" },
  "prod.secondChoiceQty": { fr: "2ème choix", ar: "الاختيار الثاني" },
  "prod.wasteQty": { fr: "Rebut", ar: "النفاية" },
  "prod.consumedMaterials": { fr: "Matières consommées", ar: "المواد المستهلَكة" },
  "prod.noMaterials": { fr: "Aucune matière enregistrée sur ce lot.", ar: "لا توجد مواد مسجّلة على هذه الدفعة." },
  "prod.addMaterials": { fr: "+ Ajouter des matières", ar: "+ إضافة مواد" },
  "prod.investigation": { fr: "Investigation", ar: "التحقّق" },
  "prod.investigationNote": { fr: "Ce que la vérification a établi", ar: "ما أثبته التحقّق" },
  "prod.investigationHint": {
    fr: "Décrivez ce qui explique l'écart — une cause constatée, pas une supposition.",
    ar: "صف ما يفسّر الفارق — سببًا معاينًا، لا افتراضًا.",
  },
  "prod.closeGap": { fr: "Clôturer l'écart", ar: "إغلاق الفارق" },
  "prod.err.output": {
    fr: "Indiquez au moins une quantité produite.",
    ar: "أدخل كمية منتَجة واحدة على الأقل.",
  },
  "prod.err.note": {
    fr: "Écrivez ce que la vérification a établi avant de clôturer.",
    ar: "اكتب ما أثبته التحقّق قبل الإغلاق.",
  },

  "prod.saveBatch": { fr: "Enregistrer le lot", ar: "حفظ الدفعة" },
  "prod.productMade": { fr: "Produit fabriqué", ar: "المنتج المصنوع" },
  "prod.addFinishedGoodHint": {
    fr: "Ajoutez d'abord un produit fini dans l'onglet Stock",
    ar: "أضف منتجًا نهائيًا أولًا في تبويب المخزون",
  },
  "prod.expectedShort": { fr: "Quantité attendue", ar: "الكمية المتوقَّعة" },
  "prod.expectedShortHint": { fr: "Annoncée par le compteur de la machine", ar: "معلَنة من عدّاد الآلة" },
  "prod.machineLine": { fr: "Machine / ligne", ar: "الآلة / الخط" },
  "prod.ph.machine": { fr: "Ex. Ligne 2", ar: "مثال: الخط 2" },
  "prod.ph.supervisor": { fr: "Responsable du lot", ar: "المسؤول عن الدفعة" },
  "prod.ph.operator": { fr: "Ouvrier à la machine", ar: "العامل على الآلة" },
  "prod.start": { fr: "Début", ar: "البداية" },
  "prod.end": { fr: "Fin", ar: "النهاية" },
  "prod.err.machineLine": {
    fr: "Indiquez la machine ou la ligne de production.",
    ar: "اذكر الآلة أو خط الإنتاج.",
  },
  "prod.err.expectedAnnounced": {
    fr: "Indiquez la quantité attendue annoncée par la machine.",
    ar: "اذكر الكمية المتوقَّعة التي أعلنتها الآلة.",
  },
  "prod.err.lineQuantity": {
    fr: "Indiquez une quantité pour « {item} », ou retirez cette ligne.",
    ar: "أدخل كمية لـ«{item}»، أو احذف هذا السطر.",
  },
  "prod.materialCostSum": {
    fr: "Somme des matières consommées, au coût du stock",
    ar: "مجموع المواد المستهلَكة، بتكلفة المخزون",
  },
  "prod.missingCosts": {
    fr: "{count} sans coût connu — non comptée(s)",
    ar: "{count} بلا تكلفة معروفة — غير محتسَبة",
  },
  "prod.materialCount.one": { fr: "{count} matière", ar: "مادة واحدة" },
  "prod.materialCount.two": { fr: "{count} matières", ar: "مادتان" },
  "prod.materialCount.few": { fr: "{count} matières", ar: "{count} مواد" },
  "prod.materialCount.other": { fr: "{count} matières", ar: "{count} مادة" },
  "prod.unitMaterialCost": { fr: "Coût matières / unité", ar: "تكلفة المواد / وحدة" },
  "prod.spreadOverSellable": {
    fr: "Réparti sur les unités vendables (1er + 2ème choix)",
    ar: "موزَّعة على الوحدات القابلة للبيع (اختيار أول + ثانٍ)",
  },
  "prod.availableAfterOutput": {
    fr: "Disponible une fois la sortie déclarée",
    ar: "متاح بعد التصريح بالمخرَج",
  },
  "prod.declareNow": { fr: "Déclarer la sortie maintenant", ar: "التصريح بالمخرَج الآن" },
  "prod.declareNowHint": {
    fr: "Décochez pour ouvrir le lot sans le clôturer — la sortie pourra être déclarée plus tard depuis sa fiche.",
    ar: "أزل التأشير لفتح الدفعة دون إغلاقها — يمكن التصريح بالمخرَج لاحقًا من بطاقتها.",
  },
  "prod.varianceNote": { fr: "Note sur l'écart (facultatif)", ar: "ملاحظة على الفارق (اختياري)" },
  "prod.varianceNoteHint": {
    fr: "Sans note, le lot sera marqué « Investigation requise » jusqu'à ce que l'écart soit expliqué.",
    ar: "بدون ملاحظة، ستُوسَم الدفعة بـ«يتطلّب تحقّقًا» إلى أن يُفسَّر الفارق.",
  },
  "prod.ph.varianceNote": { fr: "Ex. compteur machine recalibré", ar: "مثال: أُعيدت معايرة عدّاد الآلة" },
  "prod.ph.notes": { fr: "Observations sur le lot", ar: "ملاحظات على الدفعة" },
  "prod.stockEffect": {
    fr: "Les matières sont déduites du stock et les produits finis (1er + 2ème choix) y sont ajoutés en une seule opération côté serveur. Le rebut est enregistré mais n'entre jamais dans le stock vendable. Le coût des matières consommées suit le produit fini : il devient son coût matières estimé dans l'onglet Stock.",
    ar: "تُخصَم المواد من المخزون وتُضاف إليه المنتجات النهائية (اختيار أول + ثانٍ) في عملية واحدة على الخادم. تُسجَّل النفاية لكنها لا تدخل أبدًا في المخزون القابل للبيع. تكلفة المواد المستهلَكة تتبع المنتج النهائي: تصير تكلفة موادّه التقديرية في تبويب المخزون.",
  },
  "prod.rawMaterialsOnlyLead": { fr: "matières premières", ar: "المواد الأولية" },
  "prod.rawMaterialsOnly": {
    fr: "Ce coût ne comprend que les {lead}. Main-d'œuvre, énergie, amortissement des machines et frais généraux n'y sont pas — le coût de revient réel du lot est plus élevé.",
    ar: "لا تشمل هذه التكلفة سوى {lead}. اليد العاملة والطاقة واهتلاك الآلات والمصاريف العامة ليست ضمنها — سعر تكلفة الدفعة الحقيقي أعلى.",
  },

  "prod.schedule": { fr: "Horaire", ar: "التوقيت" },
  "prod.noMaterialsRecorded": { fr: "Aucune matière enregistrée", ar: "لا توجد مواد مسجّلة" },
  "prod.noMaterialsDesc": {
    fr: "Ce lot n'a encore consommé aucune matière première.",
    ar: "لم تستهلك هذه الدفعة أي مادة أولية بعد.",
  },
  "prod.col.materialCost": { fr: "Coût", ar: "التكلفة" },
  "prod.addRow": { fr: "+ Ligne", ar: "+ سطر" },
  "prod.saveConsumption": { fr: "Enregistrer la consommation", ar: "حفظ الاستهلاك" },
  "prod.addConsumption": { fr: "+ Ajouter une consommation", ar: "+ إضافة استهلاك" },
  "prod.outputSection": { fr: "Sortie de production", ar: "مخرَج الإنتاج" },
  "prod.materialsAtStockCost": {
    fr: "Matières premières consommées, au coût du stock",
    ar: "المواد الأولية المستهلَكة، بتكلفة المخزون",
  },
  "prod.spreadNoWaste": {
    fr: "Réparti sur les unités vendables — le rebut n'en absorbe aucune part",
    ar: "موزَّعة على الوحدات القابلة للبيع — لا تتحمّل النفاية أي حصة منها",
  },
  "prod.materialCostOnly": {
    fr: "Coût matières uniquement : main-d'œuvre, énergie, amortissement des machines et frais généraux ne sont pas comptés. C'est aussi ce montant qui devient le coût matières estimé du produit fini dans l'onglet Stock.",
    ar: "تكلفة المواد فقط: اليد العاملة والطاقة واهتلاك الآلات والمصاريف العامة غير محتسَبة. وهذا المبلغ نفسه هو الذي يصير تكلفة المواد التقديرية للمنتج النهائي في تبويب المخزون.",
  },
  "prod.outputNotDeclaredYet": {
    fr: "La sortie de ce lot n'a pas encore été déclarée. Tant qu'elle ne l'est pas, l'écart n'est pas calculé — un lot non compté n'est pas un lot dont tout manque.",
    ar: "لم يُصرَّح بمخرَج هذه الدفعة بعد. وما دام لم يُصرَّح به، لا يُحسب الفارق — الدفعة غير المعدودة ليست دفعة ضاع كل ما فيها.",
  },
  "prod.expectedCorrectHint": {
    fr: "Corrigez si le compteur a été relevé après coup",
    ar: "صحّح إذا قُرئ العدّاد لاحقًا",
  },
  "prod.varianceSection": { fr: "Écart de production", ar: "فارق الإنتاج" },
  "prod.varianceJustified": { fr: "Cet écart a été justifié.", ar: "بُرِّر هذا الفارق." },
  "prod.varianceNeedsCheck": {
    fr: "{quantity} {unit} {direction}. Une vérification est nécessaire — notez ci-dessous ce que l'investigation a établi.",
    ar: "{quantity} {unit} {direction}. يلزم تحقّق — دوّن أدناه ما أثبته التحقّق.",
  },
  "prod.varianceMissing": { fr: "ne sont pas comptabilisées", ar: "غير محتسَبة" },
  "prod.varianceSurplus": { fr: "sont en excédent", ar: "فائضة" },
  "prod.investigationConclusion": { fr: "Conclusion de l'investigation", ar: "خلاصة التحقّق" },
  "prod.ph.conclusion": { fr: "Ce que la vérification a établi", ar: "ما أثبته التحقّق" },
  "prod.saveConclusion": { fr: "Enregistrer la conclusion", ar: "حفظ الخلاصة" },
});
