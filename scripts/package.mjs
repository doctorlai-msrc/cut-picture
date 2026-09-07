import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import JSZip from 'jszip';

const projectRoot = path.resolve(import.meta.dirname, '..');
const distDirectory = path.join(projectRoot, 'dist');
const artifactsDirectory = path.join(projectRoot, 'artifacts');
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, 'package.json'), 'utf8'),
);
const version = packageJson.version
  .split('.')
  .map((part) => part.padStart(2, '0'))
  .join('-');

async function addDirectory(zip, directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const archivePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      await addDirectory(zip, entryPath, archivePath);
    } else {
      zip.file(archivePath, await readFile(entryPath));
    }
  }
}

await rm(artifactsDirectory, { recursive: true, force: true });
await mkdir(artifactsDirectory, { recursive: true });

const zip = new JSZip();
await addDirectory(zip, distDirectory);
const archive = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
const archivePath = path.join(artifactsDirectory, `cut-picture-${version}.zip`);
await writeFile(archivePath, archive);
console.log(`Created ${path.relative(projectRoot, archivePath)}`);
