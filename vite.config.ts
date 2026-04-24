/**
 * Vite config for the ConsentTheater sidebar UI (Preact + Tailwind + shadcn).
 *
 * Background and content scripts are bundled separately by esbuild inside
 * scripts/build.js — they don't fit Vite's UI-oriented pipeline (service worker
 * + content script contexts, no HTML entry, single-file IIFE output needed).
 */
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARED_OUT = path.resolve(__dirname, 'dist/.shared');

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  // Relative asset paths so the built HTML works from chrome-extension://ID/ui/sidebar.html
  base: './',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  },

  root: path.resolve(__dirname, 'src/ui'),

  build: {
    outDir: path.resolve(SHARED_OUT, 'ui'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    minify: 'esbuild',

    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },

  server: { port: 5173 }
});
