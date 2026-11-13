// 커밋할 파일만 린트·포맷한다.
//
// ESLint 9 는 실행 위치(cwd)에서만 설정 파일을 찾는다. 루트에서 그대로 돌리면
// apps/web/eslint.config.mjs 를 못 찾으므로, 워크스페이스마다 그 폴더에서 실행한다.
// Prettier 는 위치와 상관없어서 루트에서 한 번에 돌린다.
// 경고도 커밋을 막는다(--max-warnings=0) — 경고가 쌓이면 아무도 읽지 않게 된다.

const path = require('node:path');

const quote = (files) => files.map((file) => `"${file}"`).join(' ');

/** 워크스페이스 폴더 기준 상대 경로로 바꿔 그 워크스페이스에서 eslint 를 돌린다 */
const eslintIn = (pkg, dir) => (files) => {
  const relative = files.map((file) =>
    path.relative(path.join(__dirname, dir), file),
  );
  return [
    `pnpm --filter ${pkg} exec eslint --fix --max-warnings=0 ${quote(relative)}`,
    `prettier --write ${quote(files)}`,
  ];
};

module.exports = {
  'apps/web/**/*.{ts,tsx,js,jsx,mjs,cjs}': eslintIn('@team1/web', 'apps/web'),
  'apps/mobile/**/*.{ts,tsx,js,jsx,mjs,cjs}': eslintIn(
    '@team1/mobile',
    'apps/mobile',
  ),
  'packages/**/*.{ts,tsx,js,jsx,mjs,cjs}': (files) =>
    `prettier --write ${quote(files)}`,
  '*.{json,md,yaml,yml,mjs,cjs}': 'prettier --write',
  '.github/**/*.{yml,yaml,md}': 'prettier --write',
};
