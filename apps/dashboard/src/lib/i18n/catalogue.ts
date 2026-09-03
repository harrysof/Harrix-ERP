/**
 * How a translated string is written down.
 *
 * The two languages sit on the same line rather than in two parallel
 * dictionaries. That was the old shape, and it does not survive a catalogue
 * this size: adding a French label at line 40 and its Arabic twin at line
 * 900 is an invitation to forget the second one, and reviewing a change means
 * reading two files at once. Here the pair is the unit — a key with only one
 * language is a type error at the point you are typing it.
 *
 * `dev` is an optional note for whoever translates next: where the string
 * appears, or which of two French senses is meant. It never reaches the UI.
 */
export interface Entry {
  fr: string;
  ar: string;
  dev?: string;
}

/**
 * Identity at runtime; its whole job is to pin the value's type so that
 * `TranslationKey` stays a union of literal keys instead of widening to
 * `string`, which would silence every typo.
 */
export function catalogue<const T extends Record<string, Entry>>(entries: T): T {
  return entries;
}
