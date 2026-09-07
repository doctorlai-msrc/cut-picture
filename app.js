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
  imagePreview: document.querySelector('#imagePreview'),
  pieceCount: document.querySelector('#pieceCount'),
  piecesGrid: document.querySelector('#piecesGrid'),
  rowsInput: document.querySelector('#rowsInput'),
  sourcePreview: document.querySelector('#sourcePreview'),
  themeToggle: document.querySelector('#themeToggle'),
};

let settings = loadSettings();
let sourceImage = null;
let sourceFileName = 'picture';
let sourceObjectUrl = '';

applySettings();
bindEvents();

function loadSettings() {
  try {
    return {
      ...defaultSettings,
      ...JSON.parse(localStorage.getItem(storageKey) || '{}'),
    };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(storageKey, JSON.stringify(settings));
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
      settings.rows = clampGridValue(elements.rowsInput.value);
      settings.cols = clampGridValue(elements.colsInput.value);
      saveSettings();
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

function clampGridValue(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 1;
  }
  return Math.min(20, Math.max(1, parsed));
}

function loadImage(file) {
  if (!file.type.startsWith('image/')) {
    elements.fileStatus.textContent = 'Please choose an image file.';
    return;
  }

  if (sourceObjectUrl) {
    URL.revokeObjectURL(sourceObjectUrl);
  }

  sourceFileName = file.name.replace(/\.[^.]+$/, '') || 'picture';
  sourceObjectUrl = URL.createObjectURL(file);

  const image = new Image();
  image.onload = () => {
    sourceImage = image;
    elements.sourcePreview.src = sourceObjectUrl;
    elements.imagePreview.hidden = false;
    elements.fileStatus.textContent = `Loaded ${file.name}`;
    elements.imageDetails.textContent = `${image.naturalWidth} × ${image.naturalHeight}px`;
    elements.downloadAll.disabled = false;
    renderPieces();
  };
  image.onerror = () => {
    sourceImage = null;
    elements.downloadAll.disabled = true;
    elements.fileStatus.textContent = 'Could not read that image file.';
  };
  image.src = sourceObjectUrl;
}

function getTileBounds(row, col, rows, cols) {
  const width = sourceImage.naturalWidth;
  const height = sourceImage.naturalHeight;
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

function drawTile(row, col, rows, cols) {
  const bounds = getTileBounds(row, col, rows, cols);
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  canvas
    .getContext('2d')
    .drawImage(
      sourceImage,
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
  settings.rows = clampGridValue(elements.rowsInput.value);
  settings.cols = clampGridValue(elements.colsInput.value);
  elements.rowsInput.value = settings.rows;
  elements.colsInput.value = settings.cols;

  elements.piecesGrid.replaceChildren();

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
      const { bounds, canvas } = drawTile(row, col, settings.rows, settings.cols);
      const card = document.createElement('article');
      card.className = 'tile-card';

      const meta = document.createElement('div');
      meta.className = 'tile-meta';
      meta.innerHTML = `<span>R${row + 1} C${col + 1}<br>${bounds.width} × ${
        bounds.height
      }px</span>`;

      const button = document.createElement('button');
      button.className = 'tile-download';
      button.type = 'button';
      button.textContent = 'Download';
      button.addEventListener('click', () => {
        downloadCanvas(canvas, getTileFileName(row, col));
      });

      meta.append(button);
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

  const downloads = [];
  for (let row = 0; row < settings.rows; row += 1) {
    for (let col = 0; col < settings.cols; col += 1) {
      const { canvas } = drawTile(row, col, settings.rows, settings.cols);
      downloads.push({
        blob: await canvasToBlob(canvas),
        fileName: getTileFileName(row, col),
      });
    }
  }

  downloads.forEach(({ blob, fileName }, index) => {
    if (blob) {
      window.setTimeout(() => triggerDownload(blob, fileName), index * 120);
    }
  });

  elements.downloadStatus.textContent = `Started ${downloads.length} download${
    downloads.length === 1 ? '' : 's'
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
