import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 전역 함수(globals)를 켜지 않아서 Testing Library 가 테스트마다 화면을 자동으로 치우지 못한다 — 직접 치운다
afterEach(() => {
  cleanup();
});
