import { describe, expect, it } from 'vitest';

import { getSettingsUrl, getUrlSettings } from '../src/url-settings.js';

describe('getUrlSettings', () => {
  it('returns no overrides when shareable parameters are absent', () => {
    expect(getUrlSettings('?campaign=summer')).toEqual({});
  });

  it('maps width to columns and height to rows', () => {
    expect(getUrlSettings('?lang=zh-TW&width=6&height=4')).toEqual({
      locale: 'zh-TW',
      cols: 6,
      rows: 4,
    });
  });

  it('normalizes supported locale aliases', () => {
    expect(getUrlSettings('?lang=pt-PT&width=19&height=2')).toEqual({
      locale: 'pt-BR',
      cols: 19,
      rows: 2,
    });
  });

  it.each([
    '?lang=enigma&width=3px&height=2.5',
    '?lang=en--bad&width=0&height=21',
    '?lang=fr-???&width=-2&height=999',
    '?lang=fr-12&width=wide&height=high',
    '?lang=fr-a1&width=wide&height=high',
    '?lang=en-12&width=wide&height=high',
  ])('ignores malformed and unsupported values in %s', (search) => {
    expect(getUrlSettings(search)).toEqual({});
  });

  it('returns only valid overrides for mixed input', () => {
    expect(getUrlSettings('?lang=fr&width=wide&height=4')).toEqual({
      locale: 'fr',
      rows: 4,
    });
  });
});

describe('getSettingsUrl', () => {
  it('sets all shareable settings and preserves other URL state', () => {
    const result = getSettingsUrl(
      'https://example.test/cutter?campaign=summer&width=2#preview',
      { locale: 'fr', cols: 7, rows: 5 },
    );
    const url = new URL(result);

    expect(url.pathname).toBe('/cutter');
    expect(url.searchParams.get('campaign')).toBe('summer');
    expect(url.searchParams.get('lang')).toBe('fr');
    expect(url.searchParams.get('width')).toBe('7');
    expect(url.searchParams.get('height')).toBe('5');
    expect(url.hash).toBe('#preview');
  });

  it('preserves the raw encoding of unrelated parameters', () => {
    expect(
      getSettingsUrl('https://example.test/?token=a%20b&sig=~x', {
        locale: 'en',
        cols: 3,
        rows: 2,
      }),
    ).toBe('https://example.test/?token=a%20b&sig=~x&lang=en&width=3&height=2');
  });
});
