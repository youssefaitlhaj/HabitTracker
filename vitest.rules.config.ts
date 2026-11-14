import { defineConfig } from 'vitest/config';

/** Firestore rules tests: run inside the emulator via `npm run test:rules`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
