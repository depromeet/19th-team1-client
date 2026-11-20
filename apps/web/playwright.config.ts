import { defineConfig, devices } from '@playwright/test';

// 3000 을 다른 서버가 쓰고 있으면 E2E_PORT=3001 처럼 바꿔 돌린다
const PORT = Number(process.env.E2E_PORT ?? 3000);
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  // CI 에서 test.only 가 남아 있으면 실패시킨다
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // CI 러너는 코어가 적어 테스트끼리 서버를 두고 다툰다 — Playwright CI 문서 권장대로 하나씩
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // 이 테스트는 브라우저에서 웹을 연다 — 앱 안 웹뷰에서의 동작(앱 ↔ 웹 브리지)은 보지 못한다
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // 휴대폰 화면 크기·터치만 맞춘 Chromium. 브라우저 정보(UA)는 iPhone Safari 로 보내므로
    // UA 로 갈리는 코드는 이 프로젝트에서 실제와 다르게 돈다
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    // iOS 앱의 웹뷰는 WebKit 이다. Playwright 의 WebKit 은 Safari 와 같지는 않지만
    // Chromium 과의 차이를 가장 싸게 잡는다
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  // 서버는 Playwright 가 띄운다 — 로컬은 dev(이미 떠 있으면 그대로 씀), CI 는 빌드 결과를 start
  webServer: {
    command: isCI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
