import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { resolveLang, runWithLang } from './context.js';

/**
 * Reads the request's language once, at the edge, and makes it available to
 * everything downstream via AsyncLocalStorage (see context.ts). Registered
 * globally in AppModule so every route — not just the ones someone remembers
 * to annotate — gets a correct `t()`.
 */
@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const lang = resolveLang(req.headers['accept-language']);
    runWithLang(lang, next);
  }
}
