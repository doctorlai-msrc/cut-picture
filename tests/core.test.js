import { describe, expect, it } from 'vitest';

import {
  getArchiveFileName,
  getSourceBaseName,
  getTileBounds,
  getTileFileName,
  isImageFile,
  normalizeSettings,
  parseGridValue,
} from '../src/core.js';

describe('parseGridValue', () => {
  it.each([
    ['1', 1],
    ['8', 8],
    ['999', 20],
    ['-4', 1],
    ['3.8', 3],
  ])('normalizes %s to %s', (input, expected) => {
    expect(parseGridValue(input)).toBe(expected);
  });

  it.each(['', 'not-a-number', null, undefined])('rejects %s', (input) => {
    expect(parseGridValue(input)).toBeNull();
  });
});

describe('normalizeSettings', () => {
  const defaults = { rows: 3, cols: 3, theme: 'light' };

  it('keeps valid stored settings', () => {
    expect(
      normalizeSettings({ rows: 4, cols: 5, theme: 'dark' }, defaults),
    ).toEqual({ rows: 4, cols: 5, theme: 'dark' });
  });

  it('repairs invalid and out-of-range settings', () => {
    expect(
      normalizeSettings(
        { rows: 'invalid', cols: 100, theme: 'blue' },
        defaults,
      ),
    ).toEqual({ rows: 3, cols: 20, theme: 'light' });
  });
});

describe('getSourceBaseName', () => {
  it('removes the extension and unsafe filename characters', () => {
    expect(getSourceBaseName('  family photo:<2026>.jpeg')).toBe(
      'family-photo--2026-',
    );
  });

  it('uses a fallback for an empty basename', () => {
    expect(getSourceBaseName('.png')).toBe('picture');
  });

  it('replaces control characters', () => {
    expect(getSourceBaseName('line\u0000break.png')).toBe('line-break');
  });
});

describe('isImageFile', () => {
  it('accepts image MIME types and known extensions without a MIME type', () => {
    expect(isImageFile({ name: 'photo.data', type: 'image/png' })).toBe(true);
    expect(isImageFile({ name: 'photo.WEBP', type: '' })).toBe(true);
  });

  it('rejects missing files and non-image files', () => {
    expect(isImageFile()).toBe(false);
    expect(isImageFile({ name: 'notes.txt', type: 'text/plain' })).toBe(false);
    expect(isImageFile({ name: 'notes.txt', type: '' })).toBe(false);
  });
});

describe('tile geometry and names', () => {
  it('covers odd image dimensions without gaps', () => {
    const image = { naturalWidth: 10, naturalHeight: 7 };
    const tiles = [];

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        tiles.push(getTileBounds(image, row, col, 2, 3));
      }
    }

    expect(tiles).toEqual([
      { x: 0, y: 0, width: 3, height: 4 },
      { x: 3, y: 0, width: 4, height: 4 },
      { x: 7, y: 0, width: 3, height: 4 },
      { x: 0, y: 4, width: 3, height: 3 },
      { x: 3, y: 4, width: 4, height: 3 },
      { x: 7, y: 4, width: 3, height: 3 },
    ]);
  });

  it.each([
    [10, 7, 2, 3],
    [23, 17, 7, 5],
    [20, 20, 20, 20],
    [9, 1, 1, 9],
  ])(
    'reassembles a %i x %i image cut into a %i x %i grid',
    (width, height, rows, cols) => {
      const image = { naturalWidth: width, naturalHeight: height };
      const sourcePixels = Array.from(
        { length: width * height },
        (_, index) => index,
      );
      const tiles = Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const bounds = getTileBounds(image, row, col, rows, cols);
          const pixels = Array.from(
            { length: bounds.width * bounds.height },
            (_, index) => {
              const tileX = index % bounds.width;
              const tileY = Math.floor(index / bounds.width);
              return sourcePixels[
                (bounds.y + tileY) * width + bounds.x + tileX
              ];
            },
          );
          return { ...bounds, pixels };
        }),
      );
      const reassembledPixels = [];
      let destinationY = 0;

      for (const tileRow of tiles) {
        let destinationX = 0;
        for (const tile of tileRow) {
          for (let tileY = 0; tileY < tile.height; tileY += 1) {
            for (let tileX = 0; tileX < tile.width; tileX += 1) {
              reassembledPixels[
                (destinationY + tileY) * width + destinationX + tileX
              ] = tile.pixels[tileY * tile.width + tileX];
            }
          }
          destinationX += tile.width;
        }
        expect(destinationX).toBe(width);
        destinationY += tileRow[0].height;
      }

      expect(destinationY).toBe(height);
      expect(reassembledPixels).toEqual(sourcePixels);
    },
  );

  it('pads row and column numbers in tile filenames', () => {
    expect(getTileFileName('portrait', 1, 8)).toBe('portrait-r02-c09.png');
    expect(getArchiveFileName('portrait', 2, 9)).toBe('portrait-2x9.zip');
  });
});
