import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig 의 `@/*` → `src/*` 와 같게
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // 단위·통합 테스트는 소스 옆에 둔다. e2e/ 는 Playwright 몫이라 넣지 않는다
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
