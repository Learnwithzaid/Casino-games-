import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: true,
      include: [
        'src/modules/payments/**/*.ts',
        'src/modules/wallet/**/*.ts',
        'src/plugins/**/*.ts',
        'src/app.ts',
        'src/config.ts',
        'src/prisma.ts'
      ],
      lines: 80,
      functions: 80,
      statements: 80,
      branches: 70
    }
  }
});
