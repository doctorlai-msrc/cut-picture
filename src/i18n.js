export const defaultLocale = 'en';

export const supportedLocales = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'es', label: 'Español' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'pl', label: 'Polski' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'uk', label: 'Українська' },
  { code: 'fil', label: 'Filipino' },
  { code: 'fa', label: 'فارسی' },
  { code: 'sw', label: 'Kiswahili' },
];

export const defaultMessages = {
  'meta.title': 'Cut Picture - Private image grid cutter',
  'meta.description':
    'Cut a picture into a customizable grid and download every piece privately in your browser.',
  'app.eyebrow': 'Private, browser-based image slicing',
  'app.title': 'Cut Picture',
  'app.intro':
    'Split a picture into a precise grid, preview every tile, and download one ZIP. Your image never leaves this device.',
  'theme.useDark': 'Use dark mode',
  'theme.useLight': 'Use light mode',
  'language.label': 'Language',
  'upload.title': '1. Choose a picture',
  'upload.aria': 'Choose an image file',
  'upload.drop': 'Drop an image here',
  'upload.browse': 'or click to browse your files',
  'upload.empty': 'No picture selected yet.',
  'upload.loading': 'Loading {name}...',
  'upload.invalid': 'Please choose an image file.',
  'upload.loaded': 'Loaded {name}',
  'upload.error': 'Could not read that image file.',
  'controls.title': '2. Customize the grid',
  'controls.rows': 'Rows',
  'controls.columns': 'Columns',
  'controls.swap': 'Swap rows and columns',
  'settings.saved': 'Settings are saved automatically in this browser.',
  'settings.adjusted': 'Grid size was reduced to fit this image.',
  'settings.error': 'Settings could not be saved locally.',
  'download.all': 'Download all as ZIP',
  'download.preparing': 'Preparing {completed} of {total} pieces...',
  'download.compressing': 'Compressing ZIP...',
  'download.empty': 'No pieces are ready to download.',
  'download.complete': 'Downloaded {count} pieces.',
  'download.completeOne': 'Downloaded 1 piece.',
  'download.error': 'Could not create the ZIP file.',
  'download.tile': 'Download',
  'download.tileLabel': 'Download row {row}, column {column}',
  'download.tileError': 'Could not prepare that piece.',
  'preview.title': '3. Preview pieces',
  'preview.empty': 'Upload a picture to generate a grid preview.',
  'preview.error': 'This browser could not draw the image preview.',
  'preview.count': '{count} pieces from a {rows} × {columns} grid.',
  'preview.countOne': '1 piece from a {rows} × {columns} grid.',
  'tile.position': 'Row {row}, column {column}',
  'privacy.note': 'Images are processed locally and never uploaded.',
  'support.buyMeACoffee': 'Buy me a coffee',
  'navigation.skip': 'Skip to the image cutter',
  'version.label': 'Version',
};

const localeCodes = new Map(
  supportedLocales.map(({ code }) => [code.toLowerCase(), code]),
);

export function normalizeLocale(locale) {
  if (typeof locale !== 'string' || locale.length === 0) {
    return defaultLocale;
  }

  const candidate = locale.replace('_', '-').toLowerCase();
  const exactMatch = localeCodes.get(candidate);
  if (exactMatch) {
    return exactMatch;
  }

  if (
    candidate === 'zh' ||
    candidate.startsWith('zh-hans') ||
    candidate.startsWith('zh-sg') ||
    candidate.startsWith('zh-my')
  ) {
    return 'zh-CN';
  }
  if (
    candidate.startsWith('zh-hant') ||
    candidate.startsWith('zh-hk') ||
    candidate.startsWith('zh-mo')
  ) {
    return 'zh-TW';
  }
  if (candidate === 'pt' || candidate.startsWith('pt-')) {
    return 'pt-BR';
  }
  if (candidate === 'tl' || candidate.startsWith('tl-')) {
    return 'fil';
  }

  return localeCodes.get(candidate.split('-')[0]) ?? defaultLocale;
}

export function detectLocale(languages) {
  const requestedLanguages = Array.isArray(languages) ? languages : [languages];
  for (const language of requestedLanguages) {
    const locale = normalizeLocale(language);
    if (
      locale !== defaultLocale ||
      String(language).toLowerCase().startsWith('en')
    ) {
      return locale;
    }
  }
  return defaultLocale;
}

export async function loadMessages(
  locale,
  { fetchImpl = globalThis.fetch, basePath = './lang' } = {},
) {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === defaultLocale) {
    return { locale: defaultLocale, messages: defaultMessages };
  }

  try {
    const response = await fetchImpl(`${basePath}/${normalizedLocale}.json`);
    if (!response.ok) {
      throw new Error(`Locale request failed with ${response.status}`);
    }
    return {
      locale: normalizedLocale,
      messages: { ...defaultMessages, ...(await response.json()) },
    };
  } catch {
    return { locale: defaultLocale, messages: defaultMessages };
  }
}

export function translate(messages, key, replacements = {}) {
  const template = messages[key] ?? defaultMessages[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(replacements, name) ? String(replacements[name]) : match,
  );
}
