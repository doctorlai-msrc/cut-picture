import JSZip from 'jszip';

import {
  getArchiveFileName,
  getSourceBaseName,
  getTileBounds,
  getTileFileName,
  isImageFile,
  maxGridSize,
  minGridSize,
  normalizeSettings,
  parseGridValue,
} from './core.js';
import {
  defaultMessages,
  detectLocale,
  loadMessages,
  normalizeLocale,
  supportedLocales,
  translate,
} from './i18n.js';
import { getSettingsUrl, getUrlSettings } from './url-settings.js';

const storageKey = 'cut-picture:settings';
const legacyStorageKey = 'cut-picture-settings';
const buildVersion =
  typeof __APP_VERSION__ === 'string'
    ? __APP_VERSION__
    : '2026-09-07 (development)';

function getBrowserStorage(rootWindow) {
  try {
    return rootWindow.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {
        throw new Error('Local storage is unavailable');
      },
      removeItem: () => {},
    };
  }
}

function canWriteStorage(storage) {
  const probeKey = `${storageKey}:probe`;
  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function createCutPictureApp(options = {}) {
  const rootDocument = options.document ?? globalThis.document;
  const rootWindow = options.window ?? globalThis.window;
  const storage = options.storage ?? getBrowserStorage(rootWindow);
  const storageAvailable = canWriteStorage(storage);
  const location = options.location ?? rootWindow.location;
  const history = options.history ?? rootWindow.history;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const urlApi = options.urlApi ?? globalThis.URL;
  const imageFactory = options.imageFactory ?? (() => new rootWindow.Image());
  const zipFactory = options.zipFactory ?? (() => new JSZip());
  const localeBasePath =
    options.localeBasePath ?? `${import.meta.env.BASE_URL}lang`;

  const elementIds = [
    'appVersion',
    'colsInput',
    'downloadAll',
    'downloadStatus',
    'dropZone',
    'fileInput',
    'fileStatus',
    'imageDetails',
    'imageInfo',
    'languageSelect',
    'metaDescription',
    'pieceCount',
    'piecesGrid',
    'rowsInput',
    'settingsStatus',
    'swapGrid',
    'themeColor',
    'themeIcon',
    'themeToggle',
  ];
  const elements = Object.fromEntries(
    elementIds.map((id) => [id, rootDocument.querySelector(`#${id}`)]),
  );
  const missingElement = elementIds.find((id) => !elements[id]);
  if (missingElement) {
    throw new Error(`Missing required element #${missingElement}`);
  }

  const defaultSettings = {
    rows: 3,
    cols: 3,
    theme: rootWindow.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
    locale: detectLocale(
      rootWindow.navigator.languages ?? [rootWindow.navigator.language],
    ),
  };

  let settings = loadSettings();
  let messages = defaultMessages;
  let sourceImage = null;
  let sourceFileName = 'picture';
  let sourceDisplayName = '';
  let renderTimer = 0;
  let saveTimer = 0;
  let isDownloading = false;
  let currentTiles = [];
  let currentTileGrid = { rows: 0, cols: 0 };
  let renderFailed = false;
  let latestLoadToken = 0;
  let latestLocaleToken = 0;
  const liveMessages = new Map();

  function loadSettings() {
    let stored;
    try {
      const serialized =
        storage.getItem(storageKey) ??
        storage.getItem(legacyStorageKey) ??
        '{}';
      const parsed = JSON.parse(serialized);
      stored = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      stored = {};
    }

    const persistedSettings = {
      ...normalizeSettings(stored, defaultSettings),
      locale: normalizeLocale(stored.locale ?? defaultSettings.locale),
    };
    return {
      ...persistedSettings,
      ...getUrlSettings(location?.search ?? ''),
    };
  }

  function setLiveMessage(element, key, replacements = {}) {
    liveMessages.set(element, { key, replacements });
    element.textContent = key ? translate(messages, key, replacements) : '';
  }

  function saveSettings(announce = true) {
    try {
      storage.setItem(storageKey, JSON.stringify(settings));
      storage.removeItem(legacyStorageKey);
      if (announce) {
        setLiveMessage(elements.settingsStatus, 'settings.saved');
      }
      return true;
    } catch {
      setLiveMessage(elements.settingsStatus, 'settings.error');
      return false;
    }
  }

  function syncUrlSettings() {
    try {
      const nextUrl = getSettingsUrl(location.href, settings);
      history.replaceState(history.state, '', nextUrl);
    } catch {
      return;
    }
  }

  function populateLocales() {
    const fragment = rootDocument.createDocumentFragment();
    for (const { code, label } of supportedLocales) {
      const option = rootDocument.createElement('option');
      option.value = code;
      option.textContent = label;
      fragment.append(option);
    }
    elements.languageSelect.replaceChildren(fragment);
  }

  function applyTheme() {
    rootDocument.documentElement.dataset.theme = settings.theme;
    elements.themeColor.content =
      settings.theme === 'dark' ? '#141815' : '#f7f6f2';
    const messageKey =
      settings.theme === 'dark' ? 'theme.useLight' : 'theme.useDark';
    const label = translate(messages, messageKey);
    elements.themeToggle.setAttribute('aria-label', label);
    elements.themeToggle.title = label;
    elements.themeIcon.textContent = settings.theme === 'dark' ? '☀' : '◐';
  }

  function updatePieceCount() {
    if (!sourceImage) {
      elements.pieceCount.textContent = translate(messages, 'preview.empty');
      return;
    }
    if (renderFailed) {
      elements.pieceCount.textContent = translate(messages, 'preview.error');
      return;
    }
    const count = settings.rows * settings.cols;
    elements.pieceCount.textContent = translate(
      messages,
      count === 1 ? 'preview.countOne' : 'preview.count',
      { count, rows: settings.rows, columns: settings.cols },
    );
  }

  function applyTranslations() {
    rootDocument.title = translate(messages, 'meta.title');
    elements.metaDescription.content = translate(messages, 'meta.description');
    rootDocument.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = translate(messages, element.dataset.i18n);
    });
    rootDocument
      .querySelectorAll('[data-i18n-aria-label]')
      .forEach((element) => {
        element.setAttribute(
          'aria-label',
          translate(messages, element.dataset.i18nAriaLabel),
        );
      });
    rootDocument.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.title = translate(messages, element.dataset.i18nTitle);
    });
    for (const [element, message] of liveMessages) {
      element.textContent = message.key
        ? translate(messages, message.key, message.replacements)
        : '';
    }
    rootDocument.querySelectorAll('.tile-download').forEach((button) => {
      button.textContent = translate(messages, 'download.tile');
      button.setAttribute(
        'aria-label',
        translate(messages, 'download.tileLabel', {
          row: button.dataset.row,
          column: button.dataset.column,
        }),
      );
    });
    rootDocument.querySelectorAll('.tile-card canvas').forEach((canvas) => {
      canvas.setAttribute(
        'aria-label',
        translate(messages, 'tile.position', {
          row: canvas.dataset.row,
          column: canvas.dataset.column,
        }),
      );
    });
    applyTheme();
    updatePieceCount();
  }

  async function setLocale(locale, persist = true) {
    const localeToken = (latestLocaleToken += 1);
    const requestedLocale = normalizeLocale(locale);
    settings.locale = requestedLocale;
    elements.languageSelect.value = requestedLocale;
    if (persist) {
      saveSettings();
      syncUrlSettings();
    }

    const result = await loadMessages(requestedLocale, {
      fetchImpl,
      basePath: localeBasePath,
    });
    if (localeToken !== latestLocaleToken) {
      return settings.locale;
    }

    settings.locale = result.locale;
    messages = result.messages;
    elements.languageSelect.value = settings.locale;
    rootDocument.documentElement.lang = settings.locale;
    rootDocument.documentElement.dir = ['ar', 'fa'].includes(settings.locale)
      ? 'rtl'
      : 'ltr';
    applyTranslations();
    if (persist && result.locale !== requestedLocale) {
      saveSettings();
      syncUrlSettings();
    } else if (
      !persist &&
      result.locale !== requestedLocale &&
      getUrlSettings(location?.search ?? '').locale === requestedLocale
    ) {
      syncUrlSettings();
    }
    return settings.locale;
  }

  function applySettings() {
    elements.rowsInput.value = settings.rows;
    elements.colsInput.value = settings.cols;
    elements.languageSelect.value = settings.locale;
    applyTheme();
  }

  function constrainGridToImage() {
    if (!sourceImage) {
      elements.rowsInput.max = maxGridSize;
      elements.colsInput.max = maxGridSize;
      return false;
    }
    const maxRows = Math.max(
      minGridSize,
      Math.min(maxGridSize, sourceImage.naturalHeight),
    );
    const maxCols = Math.max(
      minGridSize,
      Math.min(maxGridSize, sourceImage.naturalWidth),
    );
    elements.rowsInput.max = maxRows;
    elements.colsInput.max = maxCols;
    const nextRows = Math.min(settings.rows, maxRows);
    const nextCols = Math.min(settings.cols, maxCols);
    const changed = nextRows !== settings.rows || nextCols !== settings.cols;
    settings.rows = nextRows;
    settings.cols = nextCols;
    elements.rowsInput.value = settings.rows;
    elements.colsInput.value = settings.cols;
    if (changed) {
      syncUrlSettings();
    }
    return changed;
  }

  function commitGridSettings(writeInputs, persist) {
    let rows = parseGridValue(elements.rowsInput.value);
    let cols = parseGridValue(elements.colsInput.value);

    if (rows === null || cols === null) {
      if (writeInputs) {
        elements.rowsInput.value = settings.rows;
        elements.colsInput.value = settings.cols;
      }
      if (persist) {
        saveSettings();
        syncUrlSettings();
      }
      return false;
    }

    if (sourceImage) {
      rows = Math.min(rows, sourceImage.naturalHeight);
      cols = Math.min(cols, sourceImage.naturalWidth);
    }
    const changed = rows !== settings.rows || cols !== settings.cols;
    settings.rows = rows;
    settings.cols = cols;

    if (writeInputs) {
      elements.rowsInput.value = settings.rows;
      elements.colsInput.value = settings.cols;
    }
    if (persist) {
      saveSettings();
      syncUrlSettings();
    }
    return changed;
  }

  function scheduleSaveSettings() {
    rootWindow.clearTimeout(saveTimer);
    saveTimer = rootWindow.setTimeout(() => {
      saveSettings();
      syncUrlSettings();
    }, 300);
  }

  function scheduleRenderPieces() {
    rootWindow.clearTimeout(renderTimer);
    renderTimer = rootWindow.setTimeout(renderPieces, 220);
  }

  function loadImage(file) {
    const loadToken = (latestLoadToken += 1);
    if (!isImageFile(file)) {
      setLiveMessage(elements.fileStatus, 'upload.invalid');
      return;
    }

    let objectUrl;
    try {
      objectUrl = urlApi.createObjectURL(file);
    } catch {
      setLiveMessage(elements.fileStatus, 'upload.error');
      return;
    }

    const nextSourceFileName = getSourceBaseName(file.name);
    const image = imageFactory();
    sourceImage = null;
    renderFailed = false;
    currentTiles = [];
    elements.downloadAll.disabled = true;
    elements.imageInfo.hidden = true;
    constrainGridToImage();
    elements.piecesGrid.replaceChildren();
    updatePieceCount();
    setLiveMessage(elements.fileStatus, 'upload.loading', { name: file.name });

    image.onload = () => {
      urlApi.revokeObjectURL(objectUrl);
      if (loadToken !== latestLoadToken) {
        return;
      }
      sourceImage = image;
      sourceFileName = nextSourceFileName;
      sourceDisplayName = file.name;
      elements.imageInfo.hidden = false;
      setLiveMessage(elements.fileStatus, 'upload.loaded', {
        name: sourceDisplayName,
      });
      elements.imageDetails.textContent = `${image.naturalWidth} × ${image.naturalHeight}px`;
      elements.downloadAll.disabled = isDownloading;
      if (constrainGridToImage()) {
        if (saveSettings(false)) {
          setLiveMessage(elements.settingsStatus, 'settings.adjusted');
        }
      }
      renderPieces();
    };
    image.onerror = () => {
      urlApi.revokeObjectURL(objectUrl);
      if (loadToken !== latestLoadToken) {
        return;
      }
      sourceImage = null;
      renderFailed = false;
      elements.downloadAll.disabled = true;
      elements.imageInfo.hidden = true;
      elements.imageDetails.textContent = '';
      setLiveMessage(elements.fileStatus, 'upload.error');
      constrainGridToImage();
      renderPieces();
    };
    image.src = objectUrl;
  }

  function drawTile(image, row, col, rows, cols) {
    const bounds = getTileBounds(image, row, col, rows, cols);
    const canvas = rootDocument.createElement('canvas');
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D is unavailable');
    }
    context.drawImage(
      image,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    return { bounds, canvas };
  }

  function renderPieces() {
    elements.piecesGrid.replaceChildren();
    currentTiles = [];
    currentTileGrid = { rows: settings.rows, cols: settings.cols };
    renderFailed = false;
    updatePieceCount();

    if (!sourceImage) {
      return;
    }

    const fragment = rootDocument.createDocumentFragment();
    try {
      for (let row = 0; row < settings.rows; row += 1) {
        for (let col = 0; col < settings.cols; col += 1) {
          const { bounds, canvas } = drawTile(
            sourceImage,
            row,
            col,
            settings.rows,
            settings.cols,
          );
          const fileName = getTileFileName(sourceFileName, row, col);
          currentTiles.push({ canvas, fileName });

          const card = rootDocument.createElement('article');
          card.className = 'tile-card';
          canvas.setAttribute('role', 'img');
          canvas.dataset.row = row + 1;
          canvas.dataset.column = col + 1;
          canvas.setAttribute(
            'aria-label',
            translate(messages, 'tile.position', {
              row: row + 1,
              column: col + 1,
            }),
          );

          const meta = rootDocument.createElement('div');
          meta.className = 'tile-meta';
          const label = rootDocument.createElement('span');
          label.append(
            translate(messages, 'tile.position', {
              row: row + 1,
              column: col + 1,
            }),
            rootDocument.createElement('br'),
            `${bounds.width} × ${bounds.height}px`,
          );

          const button = rootDocument.createElement('button');
          button.className = 'tile-download';
          button.type = 'button';
          button.dataset.row = row + 1;
          button.dataset.column = col + 1;
          button.textContent = translate(messages, 'download.tile');
          button.setAttribute(
            'aria-label',
            translate(messages, 'download.tileLabel', {
              row: row + 1,
              column: col + 1,
            }),
          );
          button.addEventListener('click', () => {
            void downloadCanvas(canvas, fileName);
          });

          meta.append(label, button);
          card.append(canvas, meta);
          fragment.append(card);
        }
      }
      elements.piecesGrid.append(fragment);
      elements.downloadAll.disabled = isDownloading;
    } catch {
      renderFailed = true;
      currentTiles = [];
      elements.piecesGrid.replaceChildren();
      updatePieceCount();
      elements.downloadAll.disabled = true;
    }
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  async function downloadCanvas(canvas, fileName) {
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) {
        throw new Error('Canvas conversion failed');
      }
      triggerDownload(blob, fileName);
    } catch {
      setLiveMessage(elements.downloadStatus, 'download.tileError');
    }
  }

  async function downloadAllPieces() {
    if (!sourceImage || isDownloading) {
      return;
    }

    isDownloading = true;
    elements.downloadAll.disabled = true;
    commitGridSettings(true, true);
    if (
      currentTileGrid.rows !== settings.rows ||
      currentTileGrid.cols !== settings.cols
    ) {
      renderPieces();
    }

    const tiles = [...currentTiles];
    if (tiles.length === 0) {
      setLiveMessage(elements.downloadStatus, 'download.empty');
      isDownloading = false;
      elements.downloadAll.disabled = renderFailed;
      return;
    }
    const archiveFileName = getArchiveFileName(
      sourceFileName,
      currentTileGrid.rows,
      currentTileGrid.cols,
    );

    try {
      const zip = zipFactory();
      let completed = 0;
      for (const { canvas, fileName } of tiles) {
        const blob = await canvasToBlob(canvas);
        if (!blob) {
          throw new Error('Canvas conversion failed');
        }
        zip.file(fileName, blob);
        completed += 1;
        setLiveMessage(elements.downloadStatus, 'download.preparing', {
          completed,
          total: tiles.length,
        });
      }
      setLiveMessage(elements.downloadStatus, 'download.compressing');
      const archive = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
      });
      triggerDownload(archive, archiveFileName);
      setLiveMessage(
        elements.downloadStatus,
        tiles.length === 1 ? 'download.completeOne' : 'download.complete',
        { count: tiles.length },
      );
    } catch {
      setLiveMessage(elements.downloadStatus, 'download.error');
    } finally {
      isDownloading = false;
      elements.downloadAll.disabled = !sourceImage || renderFailed;
    }
  }

  function triggerDownload(blob, fileName) {
    const link = rootDocument.createElement('a');
    const objectUrl = urlApi.createObjectURL(blob);
    link.href = objectUrl;
    link.download = fileName;
    try {
      rootDocument.body.append(link);
      link.click();
    } finally {
      link.remove();
      rootWindow.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 1000);
    }
  }

  function bindEvents() {
    elements.fileInput.addEventListener('change', (event) => {
      const [file] = event.target.files;
      if (file) {
        loadImage(file);
      }
      event.target.value = '';
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, () => {
        elements.dropZone.classList.remove('is-dragging');
      });
    });
    elements.dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      const [file] = event.dataTransfer.files;
      if (file) {
        loadImage(file);
      }
    });

    [elements.rowsInput, elements.colsInput].forEach((input) => {
      input.addEventListener('input', () => {
        if (commitGridSettings(false, false)) {
          scheduleSaveSettings();
          scheduleRenderPieces();
        }
      });
      input.addEventListener('change', () => {
        rootWindow.clearTimeout(saveTimer);
        rootWindow.clearTimeout(renderTimer);
        commitGridSettings(true, true);
        if (
          currentTileGrid.rows !== settings.rows ||
          currentTileGrid.cols !== settings.cols
        ) {
          renderPieces();
        }
      });
    });

    elements.swapGrid.addEventListener('click', () => {
      [settings.rows, settings.cols] = [settings.cols, settings.rows];
      constrainGridToImage();
      applySettings();
      saveSettings();
      syncUrlSettings();
      renderPieces();
    });
    elements.themeToggle.addEventListener('click', () => {
      settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
      saveSettings();
      applyTheme();
    });
    elements.languageSelect.addEventListener('change', () => {
      void setLocale(elements.languageSelect.value);
    });
    elements.downloadAll.addEventListener('click', () => {
      void downloadAllPieces();
    });
  }

  populateLocales();
  applySettings();
  setLiveMessage(elements.fileStatus, 'upload.empty');
  setLiveMessage(
    elements.settingsStatus,
    storageAvailable ? 'settings.saved' : 'settings.error',
  );
  setLiveMessage(elements.downloadStatus, '');
  elements.appVersion.textContent = options.appVersion ?? buildVersion;
  bindEvents();
  const ready = setLocale(settings.locale, false);

  return {
    downloadAllPieces,
    getSettings: () => ({ ...settings }),
    loadImage,
    ready,
    renderPieces,
    setLocale,
  };
}
