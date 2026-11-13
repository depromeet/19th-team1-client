// apps/mobile — Expo 공식 설정 + 팀 규칙 + Prettier.
// https://docs.expo.dev/guides/using-eslint/

import { defineConfig, globalIgnores } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier/flat';

import { teamRules } from './base.mjs';

export default defineConfig([
  ...expoConfig,
  ...teamRules,
  // Prettier 와 겹치는 서식 규칙을 끈다 — 반드시 마지막
  prettier,
  globalIgnores(['.expo/**', 'dist/**', 'ios/**', 'android/**']),
]);
