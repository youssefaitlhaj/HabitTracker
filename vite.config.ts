/// <reference types="vitest" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Writes the list of built files into dist/sw.js, so the service worker can save them all on
 * install and the installed app opens offline. Skips source maps and the old .woff font
 * fallbacks (every browser that runs service workers uses .woff2).
 */
function precacheManifest(): Plugin {
  const placeholder = "const PRECACHE = { version: 'dev', files: [] };";
  let built: string[] = [];
  return {
    name: 'ledger-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      built = Object.keys(bundle);
    },
    closeBundle() {
      const publicFiles = readdirSync('public').filter((name) => name !== 'sw.js');
      const files = [
        '/', // the app's page (index.html), served for every route
        ...[...built, ...publicFiles]
          .filter((name) => name !== 'index.html' && !name.endsWith('.map') && !name.endsWith('.woff'))
          .map((name) => `/${name}`)
          .sort(),
      ];
      const version = createHash('sha256').update(files.join('\n')).update(readFileSync('dist/index.html')).digest('hex').slice(0, 12);
      const sw = join('dist', 'sw.js');
      const source = readFileSync(sw, 'utf8');
      if (!source.includes(placeholder)) throw new Error('public/sw.js: precache placeholder not found');
      writeFileSync(sw, source.replace(placeholder, `const PRECACHE = ${JSON.stringify({ version, files })};`));
    },
  };
}

export default defineConfig({
  plugins: [react(), precacheManifest()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Firestore rules tests need the emulator: npm run test:rules
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
    css: false,
  },
});
