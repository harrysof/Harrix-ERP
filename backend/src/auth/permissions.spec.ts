import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  hasAllPermissions,
  hasPermission,
  parsePermissions,
  PERMISSIONS,
  serializePermissions,
  unknownPermissions,
} from './permissions.js';

describe('parsePermissions', () => {
  it('reads a stored comma-separated string', () => {
    expect(parsePermissions('stock:read,stock:write')).toEqual(['stock:read', 'stock:write']);
  });

  it('tolerates spacing and empty segments', () => {
    expect(parsePermissions(' stock:read , , stock:write ')).toEqual(['stock:read', 'stock:write']);
  });

  it('drops unknown strings rather than trusting the database', () => {
    expect(parsePermissions('stock:read,everything:always')).toEqual(['stock:read']);
  });

  it('returns nothing for an empty role', () => {
    expect(parsePermissions('')).toEqual([]);
  });
});

describe('serializePermissions', () => {
  it('round-trips through parse', () => {
    const input = [PERMISSIONS.STOCK_READ, PERMISSIONS.HR_WRITE];
    expect(parsePermissions(serializePermissions(input)).sort()).toEqual([...input].sort());
  });

  it('deduplicates and drops unknowns', () => {
    expect(serializePermissions(['stock:read', 'stock:read', 'nope'])).toBe('stock:read');
  });

  it('stores in a stable order regardless of input order', () => {
    const a = serializePermissions([PERMISSIONS.HR_WRITE, PERMISSIONS.STOCK_READ]);
    const b = serializePermissions([PERMISSIONS.STOCK_READ, PERMISSIONS.HR_WRITE]);
    expect(a).toBe(b);
  });
});

describe('hasPermission', () => {
  it('grants only what the role actually carries', () => {
    const granted = parsePermissions('stock:read,stock:write');
    expect(hasPermission(granted, PERMISSIONS.STOCK_WRITE)).toBe(true);
    expect(hasPermission(granted, PERMISSIONS.HR_READ)).toBe(false);
  });

  it('does not treat write as implying manage', () => {
    const granted = parsePermissions('stock:write');
    expect(hasPermission(granted, PERMISSIONS.STOCK_MANAGE)).toBe(false);
  });

  it('grants nothing to a role with no permissions', () => {
    expect(ALL_PERMISSIONS.some((p) => hasPermission([], p))).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('requires every listed permission', () => {
    const granted = parsePermissions('stock:read,stock:write');
    expect(hasAllPermissions(granted, [PERMISSIONS.STOCK_READ, PERMISSIONS.STOCK_WRITE])).toBe(true);
    expect(hasAllPermissions(granted, [PERMISSIONS.STOCK_READ, PERMISSIONS.HR_READ])).toBe(false);
  });

  it('is vacuously true when nothing is required', () => {
    expect(hasAllPermissions([], [])).toBe(true);
  });
});

describe('unknownPermissions', () => {
  it('names the typos so the API can reject them', () => {
    expect(unknownPermissions(['stock:read', 'stok:write'])).toEqual(['stok:write']);
  });
});
