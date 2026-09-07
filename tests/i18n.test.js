import { describe, expect, it, vi } from 'vitest';

import {
  defaultMessages,
  detectLocale,
  loadMessages,
  normalizeLocale,
  supportedLocales,
  translate,
} from '../src/i18n.js';

describe('locale selection', () => {
  it('publishes 25 supported locales', () => {
    expect(supportedLocales).toHaveLength(25);
    expect(supportedLocales.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['en', 'zh-CN', 'zh-TW']),
    );
  });

  it.each([
    ['zh-Hans-SG', 'zh-CN'],
    ['zh-SG', 'zh-CN'],
    ['zh-MY', 'zh-CN'],
    ['zh-Hant-HK', 'zh-TW'],
    ['pt-PT', 'pt-BR'],
    ['tl-PH', 'fil'],
    ['FR-fr', 'fr'],
    ['', 'en'],
    [undefined, 'en'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it('chooses the first supported browser language', () => {
    expect(detectLocale(['xx-YY', 'ja-JP', 'en-US'])).toBe('ja');
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale(['xx-YY'])).toBe('en');
  });
});

describe('message loading and formatting', () => {
  it('uses built-in English without a request', async () => {
    const fetchImpl = vi.fn();
    await expect(loadMessages('en', { fetchImpl })).resolves.toEqual({
      locale: 'en',
      messages: defaultMessages,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('merges a translated locale over English fallbacks', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 'app.title': 'Découper une image' }),
    });

    const result = await loadMessages('fr-FR', {
      fetchImpl,
      basePath: '/assets/lang',
    });

    expect(fetchImpl).toHaveBeenCalledWith('/assets/lang/fr.json');
    expect(result.locale).toBe('fr');
    expect(result.messages['app.title']).toBe('Découper une image');
    expect(result.messages['upload.error']).toBe(
      defaultMessages['upload.error'],
    );
  });

  it('falls back to English after a failed request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadMessages('de', { fetchImpl })).resolves.toEqual({
      locale: 'en',
      messages: defaultMessages,
    });
  });

  it('interpolates known values and preserves unknown placeholders', () => {
    expect(
      translate(defaultMessages, 'preview.count', {
        count: 9,
        rows: 3,
        columns: 3,
      }),
    ).toBe('9 pieces from a 3 × 3 grid.');
    expect(translate({}, 'missing.{value}')).toBe('missing.{value}');
  });
});
