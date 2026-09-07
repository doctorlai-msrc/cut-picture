import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { defaultMessages, supportedLocales } from '../src/i18n.js';

const languageDirectory = path.join(process.cwd(), 'public', 'lang');
const expectedKeys = Object.keys(defaultMessages).sort();

function getPlaceholders(message) {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe.each(supportedLocales)('$code locale', ({ code }) => {
  const messages = JSON.parse(
    readFileSync(path.join(languageDirectory, `${code}.json`), 'utf8'),
  );

  it('contains every supported message key', () => {
    expect(Object.keys(messages).sort()).toEqual(expectedKeys);
  });

  it('has nonempty strings with matching placeholders', () => {
    for (const key of expectedKeys) {
      expect(messages[key].trim(), key).not.toBe('');
      expect(getPlaceholders(messages[key]), key).toEqual(
        getPlaceholders(defaultMessages[key]),
      );
    }
  });
});
