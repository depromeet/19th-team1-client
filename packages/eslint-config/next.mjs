// apps/web — Next 공식 설정(core-web-vitals + typescript) + 팀 규칙 + Prettier.
// https://nextjs.org/docs/app/api-reference/config/eslint

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

import { teamRules } from './base.mjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...teamRules,
  // Prettier 와 겹치는 서식 규칙을 끈다 — 반드시 마지막
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
