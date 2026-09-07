import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url)),
);
const [year, month, day] = packageJson.version.split('.');
const versionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

function getRevision() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(`${versionDate} (${getRevision()})`),
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
  },
});
