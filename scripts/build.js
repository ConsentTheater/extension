#!/usr/bin/env node

/**
 * ConsentTheater build orchestrator.
 *
 * 1. Vite builds the Preact sidebar UI from src/ui/ → dist/.shared/ui/
 * 2. esbuild bundles background + content script as self-contained IIFEs → dist/.shared/{background,content}/
 * 3. Copies src/assets/ into dist/.shared/ (trackers-db is bundled into background.js via @consenttheater/playbill).
 * 4. For each target (chrome, firefox): copies dist/.shared/ → dist/<target>/ and
 *    writes the merged manifest.json.
 *
 * Watch mode re-runs step 2 on change in src/background or src/content, and delegates
 * UI hot-reload to Vite's dev server (not wired here — use `npm run dev` for that).
 */
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build as viteBuild } from 'vite';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SHARED_DIR = path.join(DIST_DIR, '.shared');

// Resolve the installed Playbill version from our own package.json so SettingsView
// can show it instead of the extension's manifest version. Strips ^ / ~.
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
const PLAYBILL_VERSION = (pkgJson.devDependencies?.['@consenttheater/playbill'] ?? '')
  .replace(/^[~^]/, '');
const EXTENSION_VERSION = pkgJson.version || '0.0.0';

const args = process.argv.slice(2);
const targetArg = args.find(a => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'all';
const watch = args.includes('--watch');

const TARGETS = target === 'all' ? ['chrome', 'firefox'] : [target];

const BG_CONTENT_BUILD_OPTIONS = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  logLevel: 'warning',
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  alias: {
    '@': SRC_DIR
  },
  define: {
    __PLAYBILL_VERSION__: JSON.stringify(PLAYBILL_VERSION),
    __EXTENSION_VERSION__: JSON.stringify(EXTENSION_VERSION)
  },
  tsconfig: path.join(ROOT_DIR, 'tsconfig.json')
};

async function buildUI() {
  console.log('\n[vite] Building UI...');
  await viteBuild({ configFile: path.join(ROOT_DIR, 'vite.config.ts') });
}

async function buildWorkers() {
  console.log('[esbuild] Bundling background.ts...');
  await esbuild.build({
    ...BG_CONTENT_BUILD_OPTIONS,
    entryPoints: [path.join(SRC_DIR, 'background', 'background.ts')],
    outfile: path.join(SHARED_DIR, 'background', 'background.js')
  });

  console.log('[esbuild] Bundling content-script.ts...');
  await esbuild.build({
    ...BG_CONTENT_BUILD_OPTIONS,
    entryPoints: [path.join(SRC_DIR, 'content', 'content-script.ts')],
    outfile: path.join(SHARED_DIR, 'content', 'content-script.js')
  });
}

async function copyStaticAssets() {
  const iconsSrc = path.join(SRC_DIR, 'assets', 'icons');
  const iconsDest = path.join(SHARED_DIR, 'assets', 'icons');
  if (await fs.pathExists(iconsSrc)) {
    await fs.copy(iconsSrc, iconsDest);
  }
  // trackers-db.json is no longer a static asset — Playbill is bundled into
  // background.js via `import { loadPlaybill } from '@consenttheater/playbill'`.
}

async function rewriteUiEntryPath() {
  // Vite emits ui/index.html — we move it up to ui/sidebar.html for a stable manifest path.
  const viteEmitted = path.join(SHARED_DIR, 'ui', 'index.html');
  const sidebarPath = path.join(SHARED_DIR, 'ui', 'sidebar.html');
  if (await fs.pathExists(viteEmitted)) {
    await fs.move(viteEmitted, sidebarPath, { overwrite: true });
  }
}

async function mergeManifest(browserTarget) {
  const base = await fs.readJson(path.join(SRC_DIR, 'manifest', 'base.json'));
  const override = await fs.readJson(path.join(SRC_DIR, 'manifest', `${browserTarget}.json`));
  return deepMerge(base, override);
}

async function finalizeTarget(browserTarget) {
  const outDir = path.join(DIST_DIR, browserTarget);
  await fs.emptyDir(outDir);
  await fs.copy(SHARED_DIR, outDir);
  // Strip `.shared`'s own manifest if it ever gets written (it doesn't today, but guard).
  const stray = path.join(outDir, 'manifest.json');
  if (await fs.pathExists(stray)) await fs.remove(stray);
  const manifest = await mergeManifest(browserTarget);
  await fs.writeJson(path.join(outDir, 'manifest.json'), manifest, { spaces: 2 });
  console.log(`[${browserTarget}] → dist/${browserTarget}/`);
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const key of Object.keys(b)) {
    if (b[key] && typeof b[key] === 'object' && !Array.isArray(b[key]) &&
        a[key] && typeof a[key] === 'object' && !Array.isArray(a[key])) {
      out[key] = deepMerge(a[key], b[key]);
    } else {
      out[key] = b[key];
    }
  }
  return out;
}

async function buildAll() {
  await fs.emptyDir(SHARED_DIR);
  await buildUI();
  await buildWorkers();
  await copyStaticAssets();
  await rewriteUiEntryPath();
  for (const t of TARGETS) {
    await finalizeTarget(t);
  }
}

async function main() {
  console.log('ConsentTheater build');
  console.log('====================');
  await buildAll();

  if (watch) {
    const chokidar = await import('chokidar');
    console.log('\nWatching for changes...\n');
    const watcher = chokidar.default.watch(
      [path.join(SRC_DIR, '**/*')],
      { ignoreInitial: true, ignored: /node_modules/ }
    );
    let pending = null;
    watcher.on('all', (event, filePath) => {
      console.log(`${event}: ${path.relative(ROOT_DIR, filePath)}`);
      if (pending) clearTimeout(pending);
      pending = setTimeout(async () => {
        try { await buildAll(); console.log('[watch] rebuild done'); }
        catch (e) { console.error('[watch] failed:', e); }
      }, 200);
    });
    process.on('SIGINT', () => { watcher.close(); process.exit(0); });
  }
}

// Allow running as module or via `node scripts/build.js`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error('Build failed:', err); process.exit(1); });
}
