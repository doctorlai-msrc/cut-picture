import { parseGridValue } from './core.js';
import { defaultLocale, normalizeLocale } from './i18n.js';

function parseLocale(value) {
  if (!value) {
    return null;
  }

  const requested = value.trim().replaceAll('_', '-').toLowerCase();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(requested)) {
    return null;
  }

  let canonicalLocale;
  try {
    [canonicalLocale] = Intl.getCanonicalLocales(requested);
  } catch {
    return null;
  }

  const locale = normalizeLocale(canonicalLocale);
  if (
    locale !== defaultLocale ||
    canonicalLocale.toLowerCase() === 'en' ||
    canonicalLocale.toLowerCase().startsWith('en-')
  ) {
    return locale;
  }
  return null;
}

function parseDimension(value) {
  if (value === null || !/^-?\d+$/.test(value.trim())) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || parsed > 20) {
    return null;
  }
  return parseGridValue(parsed);
}

export function getUrlSettings(search) {
  const parameters = new URLSearchParams(search);
  const settings = {};
  const rows = parseDimension(parameters.get('height'));
  const cols = parseDimension(parameters.get('width'));
  const locale = parseLocale(parameters.get('lang'));

  if (rows !== null) {
    settings.rows = rows;
  }
  if (cols !== null) {
    settings.cols = cols;
  }
  if (locale !== null) {
    settings.locale = locale;
  }

  return settings;
}

export function getSettingsUrl(href, settings) {
  const url = new URL(href);
  const shareableKeys = new Set(['lang', 'width', 'height']);
  const preservedParameters = url.search
    .slice(1)
    .split('&')
    .filter(Boolean)
    .filter((parameter) => {
      const rawKey = parameter.split('=', 1)[0];
      try {
        return !shareableKeys.has(
          decodeURIComponent(rawKey.replaceAll('+', ' ')),
        );
      } catch {
        return true;
      }
    });
  preservedParameters.push(
    `lang=${encodeURIComponent(settings.locale)}`,
    `width=${encodeURIComponent(settings.cols)}`,
    `height=${encodeURIComponent(settings.rows)}`,
  );
  url.search = preservedParameters.join('&');
  return url.toString();
}
