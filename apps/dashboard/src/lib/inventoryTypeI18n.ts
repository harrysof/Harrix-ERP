import type { Language } from "./i18n";
import type { InventoryTypeConfig } from "./types";

/**
 * An inventory type's label/singular/description are typed in by the
 * gérant (Settings → this inventory), not part of the fixed translation
 * catalogue — so switching the UI language doesn't translate them on its
 * own. These pick the Arabic variant when the UI is in Arabic and one was
 * given, falling back to the French value otherwise (the same rule the
 * backend's t() uses for a missing catalogue entry).
 *
 * Only for DISPLAY. The inventory-type edit form (InventoryTypeModal) reads
 * `label`/`singular`/`description`/`labelAr`/`singularAr`/`descriptionAr`
 * directly, never through these — picking one language's text to prefill a
 * form that edits both would silently overwrite whichever language wasn't
 * showing.
 */
export function inventoryTypeLabel(type: Pick<InventoryTypeConfig, "label" | "labelAr">, lang: Language): string {
  return lang === "ar" && type.labelAr ? type.labelAr : type.label;
}

export function inventoryTypeSingular(type: Pick<InventoryTypeConfig, "singular" | "singularAr">, lang: Language): string {
  return lang === "ar" && type.singularAr ? type.singularAr : type.singular;
}

export function inventoryTypeDescription(
  type: Pick<InventoryTypeConfig, "description" | "descriptionAr">,
  lang: Language,
): string {
  return lang === "ar" && type.descriptionAr ? type.descriptionAr : type.description;
}
