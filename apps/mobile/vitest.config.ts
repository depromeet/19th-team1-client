import { defineConfig } from 'vitest/config';

// 앱은 웹뷰를 감싸는 셸이라 화면 테스트는 하지 않는다.
// 브리지 메시지 처리 같은 셸 로직만 node 환경에서 테스트한다 (React Native 컴포넌트는 불러오지 않는다).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
