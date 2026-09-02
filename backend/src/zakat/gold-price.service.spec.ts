import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseGoldrate24Html } from './gold-price.service.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('parseGoldrate24Html', () => {
  it('extracts the "Taux actuel" DZD/gram figure from a real page snippet', () => {
    const html = readFileSync(join(here, '__fixtures__/goldrate24-snippet.html'), 'utf-8');
    expect(parseGoldrate24Html(html)).toBe(18_572.14);
  });

  it('throws when the expected markup is missing (site redesigned, or fetched the wrong page)', () => {
    expect(() => parseGoldrate24Html('<html><body>no price here</body></html>')).toThrow();
  });
});
