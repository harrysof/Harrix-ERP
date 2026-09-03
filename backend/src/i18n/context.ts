import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The backend's translation mechanism.
 *
 * A service or a DTO validator that throws a message has no request object
 * in scope — `StockService.getItem` doesn't take a `Request`, and a
 * class-validator decorator is evaluated by the library's own internals, not
 * by our controller. Threading a `lang` parameter through every method
 * signature down to where the message is built would touch hundreds of call
 * sites for a value that is really a property of the request, not of the
 * business logic.
 *
 * `AsyncLocalStorage` solves exactly this: `LanguageMiddleware` (see
 * language.middleware.ts) reads the request's language once and wraps the
 * rest of that request's handling in `runWithLang`, and anything running
 * inside — a service, a DTO validator's `message: () => t(...)` function, a
 * pure `*-math.ts` helper — can call `t()` and get the right language back,
 * the same way the frontend's `format.ts` reads a module-level language set
 * once by `LanguageContext`.
 *
 * Falls back to French outside a request (a seed script, a unit test) so
 * nothing has to special-case "there is no request here".
 */
export type Lang = 'fr' | 'ar';

const DEFAULT_LANG: Lang = 'fr';

const storage = new AsyncLocalStorage<{ lang: Lang }>();

/** Picks the language for the current request from its Accept-Language header. */
export function resolveLang(acceptLanguage: string | undefined | null): Lang {
  if (!acceptLanguage) return DEFAULT_LANG;
  return acceptLanguage.toLowerCase().startsWith('ar') ? 'ar' : DEFAULT_LANG;
}

export function runWithLang<T>(lang: Lang, fn: () => T): T {
  return storage.run({ lang }, fn);
}

export function currentLang(): Lang {
  return storage.getStore()?.lang ?? DEFAULT_LANG;
}
