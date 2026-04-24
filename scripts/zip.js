#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const targetArg = args.find(a => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'all';

const TARGETS = target === 'all' ? ['chrome', 'firefox'] : [target];

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

async function zipTarget(browserTarget) {
  const distDir = path.join(DIST_DIR, browserTarget);

  if (!await fs.pathExists(distDir)) {
    console.error(`dist/${browserTarget}/ not found. Run build first.`);
    process.exit(1);
  }

  const pkg = await fs.readJson(path.join(ROOT_DIR, 'package.json'));
  const zipName = `consenttheater-${browserTarget}-v${pkg.version}.zip`;
  const zipPath = path.join(DIST_DIR, zipName);

  if (await fs.pathExists(zipPath)) {
    await fs.remove(zipPath);
  }

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`Created ${zipName} (${sizeKB} KB)`);
      resolve();
    });
    archive.on('warning', err => { if (err.code !== 'ENOENT') reject(err); });
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

async function main() {
  console.log('ConsentTheater zip');
  console.log('==================\n');
  for (const t of TARGETS) {
    await zipTarget(t);
  }
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Zip failed:', err);
  process.exit(1);
});
