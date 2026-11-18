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
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // 앱 안 웹뷰로 열리는 화면이라 휴대폰 화면이 실제 환경에 가깝다.
    // 브라우저는 CI 설치 시간을 줄이려고 Chromium 하나로 두고 화면 크기·터치만 휴대폰으로 맞춘다
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  // 서버는 Playwright 가 띄운다 — 로컬은 dev(이미 떠 있으면 그대로 씀), CI 는 빌드 결과를 start
  webServer: {
    command: isCI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
