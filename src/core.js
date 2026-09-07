export const minGridSize = 1;
export const maxGridSize = 20;

export function parseGridValue(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.min(maxGridSize, Math.max(minGridSize, parsed));
}

export function normalizeSettings(storedSettings, defaults) {
  return {
    rows: parseGridValue(storedSettings.rows) ?? defaults.rows,
    cols: parseGridValue(storedSettings.cols) ?? defaults.cols,
    theme:
      storedSettings.theme === 'dark' || storedSettings.theme === 'light'
        ? storedSettings.theme
        : defaults.theme,
  };
}

export function getSourceBaseName(fileName) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '').trim();
  const safeName = [...withoutExtension]
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
        ? '-'
        : character,
    )
    .join('')
    .replace(/\s+/g, '-');
  return safeName || 'picture';
}

export function isImageFile(file) {
  if (!file) {
    return false;
  }
  if (file.type?.startsWith('image/')) {
    return true;
  }
  return (
    !file.type &&
    /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(file.name)
  );
}

export function getTileBounds(image, row, col, rows, cols) {
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

export function getTileFileName(sourceName, row, col) {
  return `${sourceName}-r${String(row + 1).padStart(2, '0')}-c${String(
    col + 1,
  ).padStart(2, '0')}.png`;
}

export function getArchiveFileName(sourceName, rows, cols) {
  return `${sourceName}-${rows}x${cols}.zip`;
}
