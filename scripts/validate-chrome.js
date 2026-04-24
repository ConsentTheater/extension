#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist', 'chrome');

const errors = [];
const warnings = [];
const err = m => errors.push(`[x] ${m}`);
const warn = m => warnings.push(`[!] ${m}`);
const ok = m => console.log(`[ok] ${m}`);

async function validateManifest() {
  const manifestPath = path.join(distDir, 'manifest.json');
  if (!await fs.pathExists(manifestPath)) {
    err('manifest.json not found. Run build:chrome first.');
    return null;
  }
  const manifest = await fs.readJson(manifestPath);
  if (manifest.manifest_version !== 3) err(`manifest_version must be 3, got ${manifest.manifest_version}`);
  else ok('Manifest V3');

  for (const field of ['name', 'version', 'description']) {
    if (!manifest[field]) err(`Missing required field: ${field}`);
  }
  if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) warn(`Version "${manifest.version}" not in X.Y.Z format`);
  if (manifest.name && manifest.name.length > 45) warn(`Name exceeds 45 chars (${manifest.name.length})`);
  if (manifest.description && manifest.description.length > 132) warn(`Description exceeds 132 chars (${manifest.description.length})`);
  return manifest;
}

async function validateIcons(manifest) {
  if (!manifest) return;
  if (manifest.icons) {
    for (const [, iconFile] of Object.entries(manifest.icons)) {
      if (!await fs.pathExists(path.join(distDir, iconFile))) err(`Icon missing: ${iconFile}`);
    }
    ok('Manifest icons present');
  }
  if (manifest.action?.default_icon) {
    for (const [, iconFile] of Object.entries(manifest.action.default_icon)) {
      if (!await fs.pathExists(path.join(distDir, iconFile))) err(`Action icon missing: ${iconFile}`);
    }
    ok('Action icons present');
  }
}

async function validateScripts(manifest) {
  if (!manifest) return;
  if (manifest.background?.service_worker) {
    const sw = path.join(distDir, manifest.background.service_worker);
    if (!await fs.pathExists(sw)) err(`Service worker missing: ${manifest.background.service_worker}`);
    else ok('Service worker present');
  }
  if (manifest.content_scripts) {
    for (const cs of manifest.content_scripts) {
      for (const js of cs.js || []) {
        if (!await fs.pathExists(path.join(distDir, js))) err(`Content script missing: ${js}`);
      }
    }
    ok('Content scripts present');
  }
  if (manifest.side_panel?.default_path) {
    if (!await fs.pathExists(path.join(distDir, manifest.side_panel.default_path))) err(`Side panel page missing: ${manifest.side_panel.default_path}`);
    else ok('Side panel page present');
  } else if (manifest.action?.default_popup) {
    if (!await fs.pathExists(path.join(distDir, manifest.action.default_popup))) err(`Popup missing: ${manifest.action.default_popup}`);
    else ok('Popup present');
  }
  if (manifest.options_ui?.page) {
    if (!await fs.pathExists(path.join(distDir, manifest.options_ui.page))) err(`Options page missing: ${manifest.options_ui.page}`);
    else ok('Options page present');
  }
}

async function validateNoInlineScripts() {
  const htmlFiles = ['ui/sidebar.html'];
  for (const htmlFile of htmlFiles) {
    const p = path.join(distDir, htmlFile);
    if (await fs.pathExists(p)) {
      const content = await fs.readFile(p, 'utf-8');
      if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(content)) {
        err(`Inline script in ${htmlFile} (forbidden under MV3 CSP)`);
      }
      if (/\son\w+\s*=/.test(content)) {
        err(`Inline event handler in ${htmlFile} (forbidden under MV3 CSP)`);
      }
    }
  }
  ok('No inline scripts or handlers detected');
}

async function main() {
  console.log('\nConsentTheater Chrome Validator\n' + '='.repeat(40) + '\n');

  if (!await fs.pathExists(distDir)) {
    err('dist/chrome/ not found. Run npm run build:chrome first.');
    console.log('\n' + errors.join('\n'));
    process.exit(1);
  }

  const manifest = await validateManifest();
  await validateIcons(manifest);
  await validateScripts(manifest);
  await validateNoInlineScripts();

  console.log('\n' + '='.repeat(40));
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log(w));
  }
  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(e));
    console.log(`\nFAILED (${errors.length} error${errors.length === 1 ? '' : 's'})\n`);
    process.exit(1);
  }
  console.log('\nValidation passed.\n');
}

main().catch(e => { console.error('Validation error:', e); process.exit(1); });
