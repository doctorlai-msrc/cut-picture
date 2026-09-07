import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set([
  '.git',
  'artifacts',
  'coverage',
  'dist',
  'node_modules',
  'public',
]);
const measuredExtensions = new Set(['.css', '.html', '.js', '.mjs']);

async function collectFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (measuredExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

const files = await collectFiles(projectRoot);
let javascriptBytes = 0;
let totalBytes = 0;
for (const file of files) {
  const bytes = (await readFile(file)).byteLength;
  totalBytes += bytes;
  if (['.js', '.mjs'].includes(path.extname(file))) {
    javascriptBytes += bytes;
  }
}

if (totalBytes === 0) {
  throw new Error('No source files were found for the language badge');
}

const percentage = (javascriptBytes / totalBytes) * 100;
const badge = {
  schemaVersion: 1,
  label: 'JavaScript',
  message: `${percentage.toFixed(1)}%`,
  color: 'f7df1e',
  namedLogo: 'javascript',
  logoColor: 'black',
};
const outputPath = path.resolve(
  process.argv[2] ??
    path.join(projectRoot, 'artifacts', 'badges', 'javascript.json'),
);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(badge, null, 2)}\n`);
console.log(
  `JavaScript: ${badge.message} (${javascriptBytes}/${totalBytes} bytes)`,
);
