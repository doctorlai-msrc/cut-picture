const minGridSize = 1;
const maxGridSize = 20;
const storageKey = 'cut-picture-settings';
const defaultSettings = {
  rows: 3,
  cols: 3,
  theme: window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light',
};

const elements = {
  colsInput: document.querySelector('#colsInput'),
  downloadAll: document.querySelector('#downloadAll'),
  downloadStatus: document.querySelector('#downloadStatus'),
  dropZone: document.querySelector('#dropZone'),
  fileInput: document.querySelector('#fileInput'),
  fileStatus: document.querySelector('#fileStatus'),
  imageDetails: document.querySelector('#imageDetails'),
  imageInfo: document.querySelector('#imageInfo'),
  pieceCount: document.querySelector('#pieceCount'),
  piecesGrid: document.querySelector('#piecesGrid'),
  rowsInput: document.querySelector('#rowsInput'),
  settingsStatus: document.querySelector('#settingsStatus'),
  themeToggle: document.querySelector('#themeToggle'),
};

let settings = loadSettings();
let sourceImage = null;
let sourceFileName = 'picture';
let renderTimer = 0;
let saveTimer = 0;
let currentTiles = [];
let currentTileGrid = { rows: 0, cols: 0 };
let latestLoadToken = 0;

applySettings();
bindEvents();

function loadSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(storageKey) || '{}'));
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    elements.settingsStatus.textContent =
      'Settings are saved automatically in this browser.';
  } catch {
    elements.settingsStatus.textContent = 'Settings could not be saved locally.';
  }
}

function normalizeSettings(storedSettings) {
  return {
    rows: gridValueOrDefault(storedSettings.rows, defaultSettings.rows),
    cols: gridValueOrDefault(storedSettings.cols, defaultSettings.cols),
    theme:
      storedSettings.theme === 'dark' || storedSettings.theme === 'light'
        ? storedSettings.theme
        : defaultSettings.theme,
  };
}

function applySettings() {
  elements.rowsInput.value = settings.rows;
  elements.colsInput.value = settings.cols;
  document.documentElement.dataset.theme = settings.theme;
  elements.themeToggle.textContent =
    settings.theme === 'dark' ? 'Use light mode' : 'Use dark mode';
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
      commitGridSettings(true, true);
      renderPieces();
    });
  });

  elements.themeToggle.addEventListener('click', () => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applySettings();
  });

  elements.downloadAll.addEventListener('click', downloadAllPieces);
}

function parseGridValue(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.min(maxGridSize, Math.max(minGridSize, parsed));
}

function gridValueOrDefault(value, fallback) {
  return parseGridValue(value) ?? fallback;
}

function commitGridSettings(writeInputs, persist) {
  const rows = parseGridValue(elements.rowsInput.value);
  const cols = parseGridValue(elements.colsInput.value);

  if (rows === null || cols === null) {
    if (writeInputs) {
      elements.rowsInput.value = settings.rows;
      elements.colsInput.value = settings.cols;
    }
    return false;
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
  }
  return changed;
}

function scheduleSaveSettings() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveSettings, 300);
}

function scheduleRenderPieces() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderPieces, 220);
}

function loadImage(file) {
  if (!file.type.startsWith('image/')) {
    elements.fileStatus.textContent = 'Please choose an image file.';
    return;
  }

  sourceFileName = file.name.replace(/\.[^.]+$/, '') || 'picture';
  const objectUrl = URL.createObjectURL(file);
  const loadToken = (latestLoadToken += 1);

  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    if (loadToken !== latestLoadToken) {
      return;
    }
    sourceImage = image;
    elements.imageInfo.hidden = false;
    elements.fileStatus.textContent = `Loaded ${file.name}`;
    elements.imageDetails.textContent = `${image.naturalWidth} × ${image.naturalHeight}px`;
    elements.downloadAll.disabled = false;
    renderPieces();
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    if (loadToken !== latestLoadToken) {
      return;
    }
    sourceImage = null;
    elements.downloadAll.disabled = true;
    elements.imageInfo.hidden = true;
    elements.imageDetails.textContent = '';
    elements.fileStatus.textContent = 'Could not read that image file.';
    renderPieces();
  };
  image.src = objectUrl;
}

function getTileBounds(image, row, col, rows, cols) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const x = Math.round((col * width) / cols);
  const y = Math.round((row * height) / rows);
  const nextX = Math.round(((col + 1) * width) / cols);
  const nextY = Math.round(((row + 1) * height) / rows);

  return {
    x,
    y,
    width: nextX - x,
    height: nextY - y,
  };
}

function drawTile(image, row, col, rows, cols) {
  const bounds = getTileBounds(image, row, col, rows, cols);
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  canvas
    .getContext('2d')
    .drawImage(
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

  if (!sourceImage) {
    elements.pieceCount.textContent = 'Upload a picture to generate a grid preview.';
    return;
  }

  const totalPieces = settings.rows * settings.cols;
  elements.pieceCount.textContent = `${totalPieces} piece${
    totalPieces === 1 ? '' : 's'
  } from a ${settings.rows} × ${settings.cols} grid.`;

  for (let row = 0; row < settings.rows; row += 1) {
    for (let col = 0; col < settings.cols; col += 1) {
      const { bounds, canvas } = drawTile(
        sourceImage,
        row,
        col,
        settings.rows,
        settings.cols,
      );
      const fileName = getTileFileName(row, col);
      currentTiles.push({ canvas, fileName });
      const card = document.createElement('article');
      card.className = 'tile-card';

      const meta = document.createElement('div');
      meta.className = 'tile-meta';
      const label = document.createElement('span');
      label.append(
        `R${row + 1} C${col + 1}`,
        document.createElement('br'),
        `${bounds.width} × ${bounds.height}px`,
      );

      const button = document.createElement('button');
      button.className = 'tile-download';
      button.type = 'button';
      button.textContent = 'Download';
      button.addEventListener('click', () => {
        downloadCanvas(canvas, fileName);
      });

      meta.append(label, button);
      card.append(canvas, meta);
      elements.piecesGrid.append(card);
    }
  }
}

function getTileFileName(row, col) {
  return `${sourceFileName}-r${String(row + 1).padStart(2, '0')}-c${String(
    col + 1,
  ).padStart(2, '0')}.png`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function downloadCanvas(canvas, fileName) {
  const blob = await canvasToBlob(canvas);
  if (!blob) {
    elements.downloadStatus.textContent = 'Could not prepare that piece.';
    return;
  }
  triggerDownload(blob, fileName);
}

async function downloadAllPieces() {
  if (!sourceImage) {
    return;
  }

  elements.downloadAll.disabled = true;
  elements.downloadStatus.textContent = 'Preparing pieces…';

  commitGridSettings(true, true);

  if (
    currentTileGrid.rows !== settings.rows ||
    currentTileGrid.cols !== settings.cols
  ) {
    renderPieces();
  }

  const tiles = [...currentTiles];
  if (tiles.length === 0) {
    elements.downloadStatus.textContent = 'No pieces are ready to download.';
    elements.downloadAll.disabled = false;
    return;
  }

  let completed = 0;
  let started = 0;

  await new Promise((resolve) => {
    tiles.forEach(({ canvas, fileName }, index) => {
      window.setTimeout(async () => {
        const blob = await canvasToBlob(canvas);
        if (blob) {
          started += 1;
          triggerDownload(blob, fileName);
        }

        completed += 1;
        if (completed === tiles.length) {
          resolve();
        }
      }, index * 20);
    });
  });

  elements.downloadStatus.textContent = `Started ${started} download${
    started === 1 ? '' : 's'
  }.`;
  elements.downloadAll.disabled = false;
}

function triggerDownload(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
