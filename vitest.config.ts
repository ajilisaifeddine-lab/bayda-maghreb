import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,js}', '*.test.js'],
    testTimeout: 15000,
    isolate: false,
  },
});
