import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { t } from '../i18n/messages/index.js';

/**
 * The nisab depends on the current gold price, which nobody wants to look
 * up and type in every day — so this fetches it from a public DZD/gram
 * price page and caches the result, refetching once a day. A manual value
 * always stays available (see setManual) for the day the page's markup
 * changes or the site is unreachable.
 */
const SOURCE_URL = 'https://www.goldrate24.com/fr/prix-de-lor/moyen-orient/algerie/gram/';
const SOURCE_LABEL = 'goldrate24.com';
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GoldPriceService {
  constructor(private readonly prisma: PrismaService) {}

  /** The current price — refetched automatically if the cached one is over a day old. */
  async getCurrent() {
    const latest = await this.prisma.goldPriceSnapshot.findFirst({ orderBy: { fetchedAt: 'desc' } });
    const stale = !latest || Date.now() - latest.fetchedAt.getTime() > STALE_AFTER_MS;
    if (!stale) return present(latest, false);
    return this.refresh(latest);
  }

  /** Forces a fetch right now, regardless of how fresh the cache is. */
  async forceRefresh() {
    const latest = await this.prisma.goldPriceSnapshot.findFirst({ orderBy: { fetchedAt: 'desc' } });
    return this.refresh(latest);
  }

  async setManual(pricePerGram: number) {
    const saved = await this.prisma.goldPriceSnapshot.create({ data: { pricePerGram, source: 'manuel' } });
    return present(saved, false);
  }

  private async refresh(fallback: { pricePerGram: number; source: string; fetchedAt: Date } | null) {
    try {
      const pricePerGram = await fetchFromGoldrate24();
      const saved = await this.prisma.goldPriceSnapshot.create({
        data: { pricePerGram, source: SOURCE_LABEL },
      });
      return present(saved, false);
    } catch {
      // The scrape failed (site down, or its markup changed) — serve the
      // last known price rather than blocking every Zakat screen on it,
      // but say so, so the gérant knows to check or type one manually.
      if (fallback) return present(fallback, true);
      throw new ServiceUnavailableException(t('zakat.goldPriceUnavailable'));
    }
  }
}

function present(row: { pricePerGram: number; source: string; fetchedAt: Date }, stale: boolean) {
  return { pricePerGram: row.pricePerGram, source: row.source, fetchedAt: row.fetchedAt.toISOString(), stale };
}

/**
 * Scrapes goldrate24.com's Algeria/gram page for the "Taux actuel" (24K
 * gold, DZD/gram) figure. Fragile by nature — this is HTML, not an API —
 * which is exactly why every caller falls back to the last cached price on
 * failure instead of breaking the screen.
 */
async function fetchFromGoldrate24(): Promise<number> {
  // goldrate24.com caches its page by exact URL for several minutes — a
  // plain refetch of the same URL can silently return the same stale HTML
  // (confirmed: two fetches hours apart returned an identical byte count and
  // price). A cache-busting query param forces a fresh render.
  const url = `${SOURCE_URL}?nocache=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HarrixERP/1.0)',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  if (!response.ok) throw new Error(`goldrate24.com a répondu ${response.status}`);
  return parseGoldrate24Html(await response.text());
}

/**
 * Pulled out for unit testing against a saved HTML fixture, without hitting
 * the network. Targets the page's "Taux actuel" row — the 24K DZD/gram spot
 * price — e.g. `<tr><th>Taux actuel</th><td><span class="money ">
 * <span class="sign"></span>18,572.14<span class="suffix"> DZD/gm</span>
 * </span></td></tr>`.
 */
export function parseGoldrate24Html(html: string): number {
  const match = html.match(/Taux actuel<\/th><td><span class="money\s*"><span class="sign">[^<]*<\/span>([\d,]+\.\d+)/);
  if (!match) throw new Error('Format de page inattendu sur goldrate24.com.');

  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) throw new Error('Valeur de prix invalide extraite de goldrate24.com.');
  return value;
}
