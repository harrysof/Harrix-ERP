import { currentLang } from '../i18n/context.js';

/**
 * An inventory type's label/singular/description are user data (typed in
 * Settings when the factory adds a 5th inventory), not part of the fixed
 * `t()` catalogue — so they don't translate themselves the way error
 * messages do. This is the data-side equivalent: pick the Arabic variant
 * when one was given and the request is in Arabic, otherwise fall back to
 * the French value, the same "never leave a gap" rule `t()` uses for a
 * missing entry.
 */
interface LocalizableInventoryType {
  label: string;
  singular: string;
  description: string;
  labelAr?: string | null;
  singularAr?: string | null;
  descriptionAr?: string | null;
}

export function localizeInventoryType<T extends LocalizableInventoryType>(type: T): T {
  if (currentLang() !== 'ar') return type;
  return {
    ...type,
    label: type.labelAr || type.label,
    singular: type.singularAr || type.singular,
    description: type.descriptionAr || type.description,
  };
}
