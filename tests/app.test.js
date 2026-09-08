import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCutPictureApp } from '../src/main.js';

const pageHtml = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

function createHarness({
  storedSettings,
  storage = window.localStorage,
  prefersDark = false,
  fetchImpl = vi.fn(),
  canvasBlob = new Blob(['tile'], { type: 'image/png' }),
  canvasContext = { drawImage: vi.fn() },
  zipGenerate = vi.fn().mockResolvedValue(new Blob(['zip'])),
  blockBrowserStorage = false,
  url = 'https://example.test/cutter',
} = {}) {
  document.open();
  document.write(pageHtml);
  document.close();
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: prefersDark })),
  });

  if (storedSettings !== undefined && storage === window.localStorage) {
    window.localStorage.setItem('cut-picture-settings', storedSettings);
  }

  const drawContext = canvasContext;
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
  if (typeof canvasContext === 'function') {
    getContext.mockImplementation(canvasContext);
  } else {
    getContext.mockReturnValue(drawContext);
  }
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback) => callback(canvasBlob));

  const downloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function recordDownload() {
      downloads.push({ download: this.download, href: this.href });
    },
  );

  const images = [];
  const imageFactory = vi.fn(() => {
    const image = {
      naturalWidth: 9,
      naturalHeight: 6,
      onerror: null,
      onload: null,
    };
    Object.defineProperty(image, 'src', {
      configurable: true,
      get: () => image.currentSource,
      set: (value) => {
        image.currentSource = value;
      },
    });
    images.push(image);
    return image;
  });

  let urlCounter = 0;
  const urlApi = {
    createObjectURL: vi.fn(() => `blob:test-${(urlCounter += 1)}`),
    revokeObjectURL: vi.fn(),
  };
  const zip = {
    file: vi.fn(),
    generateAsync: zipGenerate,
  };
  const zipFactory = vi.fn(() => zip);
  const appLocation = new URL(url);
  const history = {
    state: null,
    replaceState: vi.fn((_state, _unused, nextUrl) => {
      appLocation.href = nextUrl;
    }),
  };
  const appWindow = blockBrowserStorage
    ? {
        Image: window.Image,
        clearTimeout: window.clearTimeout.bind(window),
        matchMedia: window.matchMedia,
        navigator: window.navigator,
        setTimeout: window.setTimeout.bind(window),
        get localStorage() {
          throw new Error('blocked');
        },
      }
    : window;
  const appOptions = {
    document,
    window: appWindow,
    history,
    location: appLocation,
    fetch: fetchImpl,
    imageFactory,
    zipFactory,
    urlApi,
    localeBasePath: '/lang',
    appVersion: '2026-09-07 (test123)',
  };
  if (!blockBrowserStorage) {
    appOptions.storage = storage;
  }
  const app = createCutPictureApp(appOptions);

  return {
    app,
    downloads,
    drawContext,
    fetchImpl,
    images,
    history,
    location: appLocation,
    toBlob,
    urlApi,
    zip,
    zipFactory,
  };
}

function loadImage(harness, options = {}) {
  const file = new File(['image'], options.name ?? 'family photo.png', {
    type: options.type ?? 'image/png',
  });
  harness.app.loadImage(file);
  const image = harness.images.at(-1);
  image.naturalWidth = options.width ?? 9;
  image.naturalHeight = options.height ?? 6;
  image.onload();
  return image;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('settings and localization', () => {
  it('uses concise live regions for dynamic status updates', async () => {
    const harness = createHarness();
    await harness.app.ready;

    expect(document.querySelector('#settingsStatus').getAttribute('role')).toBe(
      'status',
    );
    expect(document.querySelector('#pieceCount').getAttribute('role')).toBe(
      'status',
    );
    expect(
      document.querySelector('#piecesGrid').hasAttribute('aria-live'),
    ).toBe(false);
  });

  it('restores legacy settings, applies the theme, and migrates on save', async () => {
    const harness = createHarness({
      storedSettings: JSON.stringify({
        rows: 4,
        cols: 5,
        theme: 'dark',
        locale: 'en',
      }),
    });
    await harness.app.ready;

    expect(document.querySelector('#rowsInput').value).toBe('4');
    expect(document.querySelector('#colsInput').value).toBe('5');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('#appVersion').textContent).toBe(
      '2026-09-07 (test123)',
    );

    document.querySelector('#themeToggle').click();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('cut-picture-settings')).toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem('cut-picture:settings')),
    ).toMatchObject({ rows: 4, cols: 5, theme: 'light', locale: 'en' });
    expect(harness.history.replaceState).not.toHaveBeenCalled();

    const supportLink = document.querySelector('.support-link');
    expect(supportLink.href).toBe('https://www.buymeacoffee.com/y0BtG5R');
    expect(supportLink.target).toBe('_blank');
    expect(supportLink.rel).toBe('noopener noreferrer');
  });

  it('uses valid URL settings over storage without rewriting on startup', async () => {
    const harness = createHarness({
      storedSettings: JSON.stringify({
        rows: 2,
        cols: 2,
        theme: 'dark',
        locale: 'en',
      }),
      url: 'https://example.test/cutter?campaign=summer&lang=fr&width=6&height=4#preview',
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'app.title': 'Découper une image' }),
      }),
    });
    await harness.app.ready;

    expect(harness.app.getSettings()).toEqual({
      rows: 4,
      cols: 6,
      theme: 'dark',
      locale: 'fr',
    });
    expect(document.querySelector('#rowsInput').value).toBe('4');
    expect(document.querySelector('#colsInput').value).toBe('6');
    expect(harness.history.replaceState).not.toHaveBeenCalled();
  });

  it('falls back to each stored setting when its URL value is invalid', async () => {
    const harness = createHarness({
      storedSettings: JSON.stringify({
        rows: 8,
        cols: 9,
        theme: 'dark',
        locale: 'de',
      }),
      url: 'https://example.test/cutter?lang=bad--tag&width=0&height=4',
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'app.title': 'Bild schneiden' }),
      }),
    });
    await harness.app.ready;

    expect(harness.app.getSettings()).toEqual({
      rows: 4,
      cols: 9,
      theme: 'dark',
      locale: 'de',
    });
    expect(harness.history.replaceState).not.toHaveBeenCalled();
  });

  it('uses defaults and immediately reports unavailable storage', async () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: vi.fn(),
    };
    const harness = createHarness({ storage, prefersDark: true });
    await harness.app.ready;

    expect(harness.app.getSettings()).toMatchObject({
      rows: 3,
      cols: 3,
      theme: 'dark',
    });
    expect(document.querySelector('#settingsStatus').textContent).toBe(
      'Settings could not be saved locally.',
    );
    document.querySelector('#themeToggle').click();
    expect(document.querySelector('#settingsStatus').textContent).toBe(
      'Settings could not be saved locally.',
    );
    loadImage(harness, { width: 1, height: 1 });
    expect(document.querySelector('#settingsStatus').textContent).toBe(
      'Settings could not be saved locally.',
    );
  });

  it('uses defaults when stored JSON is valid but not an object', async () => {
    const harness = createHarness({ storedSettings: 'null' });
    await harness.app.ready;

    expect(harness.app.getSettings()).toMatchObject({
      rows: 3,
      cols: 3,
      locale: 'en',
    });
  });

  it('starts when access to the browser storage property is blocked', async () => {
    const harness = createHarness({ blockBrowserStorage: true });
    await harness.app.ready;

    expect(harness.app.getSettings()).toMatchObject({ rows: 3, cols: 3 });
    expect(document.querySelector('#settingsStatus').textContent).toBe(
      'Settings could not be saved locally.',
    );
    document.querySelector('#themeToggle').click();
    expect(document.querySelector('#settingsStatus').textContent).toBe(
      'Settings could not be saved locally.',
    );
  });

  it('loads translated strings, supports RTL, and persists language changes', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      json: async () =>
        url.endsWith('/ar.json')
          ? {
              'app.title': 'قص الصورة',
              'language.label': 'اللغة',
              'support.buyMeACoffee': 'اشترِ لي قهوة',
            }
          : { 'app.title': 'Découper une image' },
    }));
    const harness = createHarness({ fetchImpl });
    await harness.app.ready;

    const languageSelect = document.querySelector('#languageSelect');
    languageSelect.value = 'ar';
    languageSelect.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(document.querySelector('h1').textContent).toBe('قص الصورة');
    });
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(languageSelect).toHaveLength(25);
    expect(languageSelect.getAttribute('aria-label')).toBe('اللغة');
    expect(document.querySelector('.support-link').textContent).toBe(
      'اشترِ لي قهوة',
    );
    expect(harness.location.searchParams.get('lang')).toBe('ar');
    expect(harness.location.searchParams.get('width')).toBe('3');
    expect(harness.location.searchParams.get('height')).toBe('3');

    await harness.app.setLocale('fr');
    expect(document.querySelector('h1').textContent).toBe('Découper une image');
    expect(document.documentElement.dir).toBe('ltr');
    expect(harness.app.getSettings().locale).toBe('fr');
  });

  it('synchronizes a requested locale before loading and corrects failures', async () => {
    let resolveLocale;
    const fetchImpl = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLocale = resolve;
        }),
    );
    const harness = createHarness({ fetchImpl });
    await harness.app.ready;

    const localePromise = harness.app.setLocale('fr');
    expect(harness.app.getSettings().locale).toBe('fr');
    expect(harness.location.searchParams.get('lang')).toBe('fr');

    const rows = document.querySelector('#rowsInput');
    rows.value = '4';
    rows.dispatchEvent(new Event('change'));
    expect(harness.location.searchParams.get('lang')).toBe('fr');
    expect(harness.location.searchParams.get('height')).toBe('4');

    resolveLocale({ ok: false, status: 503 });
    await localePromise;
    expect(harness.app.getSettings().locale).toBe('en');
    expect(harness.location.searchParams.get('lang')).toBe('en');
  });

  it('canonicalizes a failed locale from a shared startup URL', async () => {
    const harness = createHarness({
      url: 'https://example.test/cutter?lang=fr&width=5&height=4',
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    });
    await harness.app.ready;

    expect(harness.app.getSettings().locale).toBe('en');
    expect(harness.location.searchParams.get('lang')).toBe('en');
    expect(harness.location.searchParams.get('width')).toBe('5');
    expect(harness.location.searchParams.get('height')).toBe('4');
  });

  it('restores invalid inputs and debounces valid input changes', async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await harness.app.ready;
    const rows = document.querySelector('#rowsInput');
    const columns = document.querySelector('#colsInput');

    rows.value = '4';
    rows.dispatchEvent(new Event('input'));
    columns.value = '5';
    columns.dispatchEvent(new Event('input'));
    expect(harness.history.replaceState).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(harness.app.getSettings()).toMatchObject({ rows: 4, cols: 5 });
    expect(harness.history.replaceState).toHaveBeenCalledTimes(1);
    expect(harness.location.searchParams.get('width')).toBe('5');
    expect(harness.location.searchParams.get('height')).toBe('4');

    rows.value = '';
    rows.dispatchEvent(new Event('change'));
    expect(rows.value).toBe('4');
    document.querySelector('#swapGrid').click();
    expect(harness.app.getSettings()).toMatchObject({ rows: 5, cols: 4 });
    expect(harness.location.searchParams.get('width')).toBe('4');
    expect(harness.location.searchParams.get('height')).toBe('5');
  });

  it('cancels pending work when a grid change commits immediately', async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await harness.app.ready;
    loadImage(harness);
    harness.drawContext.drawImage.mockClear();
    harness.history.replaceState.mockClear();

    const rows = document.querySelector('#rowsInput');
    rows.value = '4';
    rows.dispatchEvent(new Event('input'));
    rows.dispatchEvent(new Event('change'));

    expect(harness.drawContext.drawImage).toHaveBeenCalledTimes(12);
    expect(harness.history.replaceState).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect(harness.drawContext.drawImage).toHaveBeenCalledTimes(12);
    expect(harness.history.replaceState).toHaveBeenCalledTimes(1);
  });

  it('persists the last valid grid value when final input is invalid', async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    await harness.app.ready;

    const rows = document.querySelector('#rowsInput');
    rows.value = '4';
    rows.dispatchEvent(new Event('input'));
    rows.value = '';
    rows.dispatchEvent(new Event('input'));
    rows.dispatchEvent(new Event('change'));

    expect(rows.value).toBe('4');
    expect(
      JSON.parse(window.localStorage.getItem('cut-picture:settings')).rows,
    ).toBe(4);
    expect(harness.location.searchParams.get('height')).toBe('4');
    expect(harness.history.replaceState).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect(harness.history.replaceState).toHaveBeenCalledTimes(1);
  });

  it('keeps working when browser history updates are blocked', async () => {
    const harness = createHarness();
    await harness.app.ready;
    harness.history.replaceState.mockImplementation(() => {
      throw new Error('history blocked');
    });

    const rows = document.querySelector('#rowsInput');
    rows.value = '6';
    rows.dispatchEvent(new Event('change'));

    expect(harness.app.getSettings().rows).toBe(6);
    expect(
      JSON.parse(window.localStorage.getItem('cut-picture:settings')).rows,
    ).toBe(6);
  });
});

describe('image loading and rendering', () => {
  it('rejects non-images and reports object URL failures', async () => {
    const harness = createHarness();
    await harness.app.ready;
    harness.app.loadImage(
      new File(['text'], 'notes.txt', { type: 'text/plain' }),
    );
    expect(document.querySelector('#fileStatus').textContent).toBe(
      'Please choose an image file.',
    );

    harness.urlApi.createObjectURL.mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    harness.app.loadImage(
      new File(['image'], 'photo.png', { type: 'image/png' }),
    );
    expect(document.querySelector('#fileStatus').textContent).toBe(
      'Could not read that image file.',
    );
  });

  it('renders exact tiles and clamps the grid to tiny image dimensions', async () => {
    const harness = createHarness({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          'tile.position': 'الصف {row}، العمود {column}',
        }),
      }),
    });
    await harness.app.ready;
    const image = loadImage(harness, {
      width: 4,
      height: 2,
      name: 'tiny:image.png',
    });

    expect(harness.app.getSettings()).toMatchObject({ rows: 2, cols: 3 });
    expect(document.querySelector('#rowsInput').max).toBe('2');
    expect(document.querySelector('#colsInput').max).toBe('4');
    expect(document.querySelectorAll('.tile-card')).toHaveLength(6);
    expect(document.querySelector('#pieceCount').textContent).toBe(
      '6 pieces from a 2 × 3 grid.',
    );
    expect(document.querySelector('#settingsStatus').textContent).toBe(
      'Grid size was reduced to fit this image.',
    );
    expect(harness.drawContext.drawImage.mock.calls).toEqual([
      [image, 0, 0, 1, 1, 0, 0, 1, 1],
      [image, 1, 0, 2, 1, 0, 0, 2, 1],
      [image, 3, 0, 1, 1, 0, 0, 1, 1],
      [image, 0, 1, 1, 1, 0, 0, 1, 1],
      [image, 1, 1, 2, 1, 0, 0, 2, 1],
      [image, 3, 1, 1, 1, 0, 0, 1, 1],
    ]);
    expect(document.querySelector('#downloadAll').disabled).toBe(false);
    expect(harness.location.searchParams.get('width')).toBe('3');
    expect(harness.location.searchParams.get('height')).toBe('2');

    await harness.app.setLocale('ar');
    expect(
      document.querySelector('.tile-card canvas').getAttribute('aria-label'),
    ).toBe('الصف 1، العمود 1');
  });

  it('ignores stale loads and clears the preview after the latest image fails', async () => {
    const harness = createHarness();
    await harness.app.ready;
    harness.app.loadImage(new File(['a'], 'first.png', { type: 'image/png' }));
    harness.app.loadImage(new File(['b'], 'second.png', { type: 'image/png' }));

    harness.images[0].onload();
    expect(document.querySelectorAll('.tile-card')).toHaveLength(0);
    harness.images[1].onerror();
    expect(document.querySelector('#fileStatus').textContent).toBe(
      'Could not read that image file.',
    );
    expect(document.querySelector('#imageInfo').hidden).toBe(true);
    expect(harness.urlApi.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('handles unavailable canvas rendering without leaving downloads enabled', async () => {
    const drawContext = { drawImage: vi.fn() };
    let contextAvailable = false;
    const harness = createHarness({
      canvasContext: () => (contextAvailable ? drawContext : null),
    });
    await harness.app.ready;
    loadImage(harness);

    expect(document.querySelector('#pieceCount').textContent).toBe(
      'This browser could not draw the image preview.',
    );
    expect(document.querySelector('#downloadAll').disabled).toBe(true);

    await harness.app.setLocale('en');
    expect(document.querySelector('#pieceCount').textContent).toBe(
      'This browser could not draw the image preview.',
    );
    await harness.app.downloadAllPieces();
    expect(document.querySelector('#downloadAll').disabled).toBe(true);

    contextAvailable = true;
    harness.app.renderPieces();
    expect(document.querySelectorAll('.tile-card')).toHaveLength(9);
    expect(document.querySelector('#downloadAll').disabled).toBe(false);
  });

  it('resets tiny-image input limits while a replacement image loads', async () => {
    const harness = createHarness();
    await harness.app.ready;
    loadImage(harness, { width: 1, height: 1 });
    expect(document.querySelector('#rowsInput').max).toBe('1');

    harness.app.loadImage(
      new File(['next'], 'next.png', { type: 'image/png' }),
    );
    expect(document.querySelector('#rowsInput').max).toBe('20');
    harness.images.at(-1).onerror();
    expect(document.querySelector('#colsInput').max).toBe('20');
  });

  it('loads files through the picker and drag-and-drop listeners', async () => {
    const harness = createHarness();
    await harness.app.ready;
    const pickerFile = new File(['a'], 'picker.png', { type: 'image/png' });
    const fileInput = document.querySelector('#fileInput');
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [pickerFile],
    });
    fileInput.dispatchEvent(new Event('change'));
    expect(harness.images).toHaveLength(1);

    const dropZone = document.querySelector('#dropZone');
    dropZone.dispatchEvent(new Event('dragover', { bubbles: true }));
    expect(dropZone.classList.contains('is-dragging')).toBe(true);
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [new File(['b'], 'drop.png', { type: 'image/png' })],
      },
    });
    dropZone.dispatchEvent(dropEvent);
    expect(dropZone.classList.contains('is-dragging')).toBe(false);
    expect(harness.images).toHaveLength(2);
  });
});

describe('downloads', () => {
  it('downloads an individual tile with a safe filename', async () => {
    const harness = createHarness();
    await harness.app.ready;
    loadImage(harness, { width: 1, height: 1, name: 'a photo?.png' });

    document.querySelector('.tile-download').click();
    await vi.waitFor(() => expect(harness.downloads).toHaveLength(1));
    expect(harness.downloads[0].download).toBe('a-photo--r01-c01.png');
  });

  it('packages every tile into one ZIP download', async () => {
    const harness = createHarness({
      storedSettings: JSON.stringify({
        rows: 2,
        cols: 2,
        theme: 'light',
        locale: 'en',
      }),
    });
    await harness.app.ready;
    loadImage(harness, { width: 4, height: 4, name: 'portrait.png' });

    await harness.app.downloadAllPieces();

    expect(harness.zip.file).toHaveBeenCalledTimes(4);
    expect(harness.zip.generateAsync).toHaveBeenCalledWith({
      type: 'blob',
      compression: 'STORE',
    });
    expect(harness.downloads.at(-1).download).toBe('portrait-2x2.zip');
    expect(document.querySelector('#downloadStatus').textContent).toBe(
      'Downloaded 4 pieces.',
    );
  });

  it('keeps the original ZIP identity while a replacement image loads', async () => {
    const harness = createHarness({
      storedSettings: JSON.stringify({
        rows: 2,
        cols: 2,
        theme: 'light',
        locale: 'en',
      }),
    });
    await harness.app.ready;
    loadImage(harness, { width: 4, height: 4, name: 'first.png' });

    const tileBlob = new Blob(['tile'], { type: 'image/png' });
    let releaseFirstTile;
    harness.toBlob.mockImplementation((callback) => {
      if (!releaseFirstTile) {
        releaseFirstTile = () => callback(tileBlob);
      } else {
        callback(tileBlob);
      }
    });

    const downloadPromise = harness.app.downloadAllPieces();
    harness.app.loadImage(
      new File(['second'], 'second.png', { type: 'image/png' }),
    );
    const replacementImage = harness.images.at(-1);
    replacementImage.naturalWidth = 1;
    replacementImage.naturalHeight = 1;
    replacementImage.onload();
    harness.app.loadImage(
      new File(['broken'], 'broken.png', { type: 'image/png' }),
    );
    harness.images.at(-1).onerror();
    releaseFirstTile();
    await downloadPromise;

    expect(harness.zip.file).toHaveBeenCalledTimes(4);
    expect(harness.downloads.at(-1).download).toBe('first-2x2.zip');
    expect(document.querySelector('#downloadAll').disabled).toBe(true);
  });

  it('prevents a second ZIP job while the first is active', async () => {
    let finishArchive;
    const zipGenerate = vi.fn(
      () =>
        new Promise((resolve) => {
          finishArchive = resolve;
        }),
    );
    const harness = createHarness({ zipGenerate });
    await harness.app.ready;
    loadImage(harness, { width: 2, height: 2 });

    const firstDownload = harness.app.downloadAllPieces();
    await vi.waitFor(() => expect(zipGenerate).toHaveBeenCalledTimes(1));
    const secondDownload = harness.app.downloadAllPieces();
    document.querySelector('#rowsInput').value = '1';
    document.querySelector('#rowsInput').dispatchEvent(new Event('change'));

    expect(document.querySelector('#downloadAll').disabled).toBe(true);
    expect(harness.zipFactory).toHaveBeenCalledTimes(1);
    await secondDownload;

    finishArchive(new Blob(['zip']));
    await firstDownload;
    expect(harness.downloads).toHaveLength(1);
    expect(document.querySelector('#downloadAll').disabled).toBe(false);
  });

  it('handles failed tile conversion and ZIP generation', async () => {
    const noBlobHarness = createHarness({ canvasBlob: null });
    await noBlobHarness.app.ready;
    loadImage(noBlobHarness, { width: 1, height: 1 });
    document.querySelector('.tile-download').click();
    await vi.waitFor(() => {
      expect(document.querySelector('#downloadStatus').textContent).toBe(
        'Could not prepare that piece.',
      );
    });
    await noBlobHarness.app.downloadAllPieces();
    expect(noBlobHarness.zip.generateAsync).not.toHaveBeenCalled();
    expect(document.querySelector('#downloadStatus').textContent).toBe(
      'Could not create the ZIP file.',
    );

    const failedZipHarness = createHarness({
      zipGenerate: vi.fn().mockRejectedValue(new Error('compression failed')),
    });
    await failedZipHarness.app.ready;
    loadImage(failedZipHarness, { width: 1, height: 1 });
    await failedZipHarness.app.downloadAllPieces();
    expect(document.querySelector('#downloadStatus').textContent).toBe(
      'Could not create the ZIP file.',
    );
    expect(document.querySelector('#downloadAll').disabled).toBe(false);
  });

  it('reports an individual download URL failure', async () => {
    const harness = createHarness();
    await harness.app.ready;
    loadImage(harness, { width: 1, height: 1 });
    harness.urlApi.createObjectURL.mockImplementationOnce(() => {
      throw new Error('downloads blocked');
    });

    document.querySelector('.tile-download').click();
    await vi.waitFor(() => {
      expect(document.querySelector('#downloadStatus').textContent).toBe(
        'Could not prepare that piece.',
      );
    });
  });
});
