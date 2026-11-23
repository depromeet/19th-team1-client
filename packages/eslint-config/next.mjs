// apps/web — Next 공식 설정(core-web-vitals + typescript) + 팀 규칙 + Prettier.
// https://nextjs.org/docs/app/api-reference/config/eslint

import pluginQuery from '@tanstack/eslint-plugin-query';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

import { teamRules } from './base.mjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // React Query 실수(쿼리 키에 쓰는 값 누락 등)를 잡는다
  ...pluginQuery.configs['flat/recommended'],
  ...teamRules,
  {
    // 환경 변수는 src/lib/env.ts 한 곳에서 검사해 꺼낸다 — 빠진 값을 화면이 아니라 시작할 때 알게
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/env.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: '환경 변수는 @/lib/env 에서 가져와 주세요.',
        },
      ],
    },
  },
  // Prettier 와 겹치는 서식 규칙을 끈다 — 반드시 마지막
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 테스트 결과물 (Vitest · Playwright)
    '.vitest/**',
    'playwright-report/**',
    'test-results/**',
    'e2e/.results/**',
  ]),
]);
