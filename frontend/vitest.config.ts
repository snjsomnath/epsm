import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // Increase timeout slightly for UI tests that may render components
    testTimeout: 10000,
  },
});
