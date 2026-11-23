// 완료 검사(self-review) 1단계 — "이번에 바뀐 파일"로 변경 크기를 정하고, 그 크기에서 할 것과 하지 않을 것을 낸다.
// 에이전트가 "작은 수정이라서"를 스스로 정하지 않게 판정을 스크립트가 한다.
//
//   node scripts/change-tier.mjs          지난 완료 검사 뒤로 바뀐 것으로 크기를 정한다
//   node scripts/change-tier.mjs --mark   보고를 낸 뒤 — 지금 상태를 "여기까지 검사함"으로 남긴다
//
// 이번에 바뀐 것: 검사 기록이 있으면 그 뒤로 내용이 달라진 파일. 없으면 커밋 안 된 변경,
// 그것도 없으면 2시간 안에 한 마지막 커밋. (브랜치 전체를 세면 문구 하나 고쳐도 큰 변경이 된다)
// 기록은 git 폴더 안(agent-hooks/)에 남아 커밋되지 않고, 완료 관문(stop-gate 훅)도 같은 기록을 본다.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  fingerprint,
  isCodeFile,
  readJson,
  repoRoot,
  reviewMarkFile,
  stateDir,
  writeJson,
} from './agent-hooks/lib/payload.mjs';

const BIG = 150; // 화면 파일에서 바뀐 줄이 이보다 많으면 새 화면으로 본다
const RECENT = 2 * 60 * 60; // 초

const root = repoRoot(process.cwd());
const git = (...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
const lines = (text) => text.split('\n').filter(Boolean);

const isScreen = (f) =>
  /^apps\/(web\/src\/.+\.(tsx|css)|mobile\/.+\.tsx)$/.test(f) &&
  !/\.(test|spec)\./.test(f);
const isRoute = (f) =>
  /^apps\/web\/src\/app\/(.+\/)?(page|layout)\.tsx$/.test(f);
const WORKSPACES = {
  'apps/web/': '@team1/web',
  'apps/mobile/': '@team1/mobile',
};
const workspaceOf = (f) =>
  Object.entries(WORKSPACES).find(([dir]) => f.startsWith(dir))?.[1];

const snapshotDir = path.join(stateDir(root), 'review-snapshot');
const markFile = reviewMarkFile(root);
const mark = readJson(markFile, null);

const untracked = new Set(
  lines(git('ls-files', '--others', '--exclude-standard')),
);
const dirty = new Set([
  ...lines(git('diff', '--name-only', 'HEAD')),
  ...untracked,
]);
const lastCommitAge =
  Date.now() / 1000 - Number(git('log', '-1', '--format=%ct') || 0);
const lastCommit =
  lastCommitAge < RECENT
    ? new Set(lines(git('diff', '--name-only', 'HEAD~1', 'HEAD')))
    : new Set();

const work = new Set(dirty.size > 0 ? dirty : lastCommit);
if (mark?.head && mark.head !== git('rev-parse', 'HEAD')) {
  // 기록 뒤에 커밋한 것도 이번 작업이다
  for (const f of lines(git('diff', '--name-only', mark.head, 'HEAD')))
    work.add(f);
}

if (process.argv.includes('--mark')) {
  rmSync(snapshotDir, { recursive: true, force: true });
  const files = {};
  for (const f of work) {
    if (!isCodeFile(f)) continue;
    files[f] = fingerprint(path.join(root, f));
    const abs = path.join(root, f);
    if (existsSync(abs)) {
      const dst = path.join(snapshotDir, f);
      mkdirSync(path.dirname(dst), { recursive: true });
      writeFileSync(dst, readFileSync(abs));
    }
  }
  // 앞선 기록 중 이번에 안 바뀐 파일의 지문은 남겨 둔다 — 완료 관문이 이미 검사한 것으로 본다
  writeJson(markFile, {
    head: git('rev-parse', 'HEAD'),
    files: { ...mark?.files, ...files },
  });
  console.log(
    `기록함 — 다음 완료 검사는 지금 뒤로 바뀐 것만 본다 (코드 파일 ${Object.keys(files).length}개)`,
  );
  process.exit(0);
}

let scope = dirty.size > 0 ? '커밋 안 된 변경' : '2시간 안의 마지막 커밋';
if (mark) scope = '지난 완료 검사 뒤';

const code = [];
const newFiles = [];
let screenLines = 0;

for (const f of [...work].sort()) {
  if (!isCodeFile(f)) continue;
  const abs = path.join(root, f);
  if (mark && mark.files?.[f] === fingerprint(abs)) continue; // 기록 뒤로 안 바뀜
  code.push(f);

  const wasTracked = (() => {
    try {
      git('cat-file', '-e', `${dirty.size > 0 ? 'HEAD' : 'HEAD~1'}:${f}`);
      return true;
    } catch {
      return false;
    }
  })();
  const snapshot = path.join(snapshotDir, f);
  if (!wasTracked && !existsSync(snapshot)) newFiles.push(f);

  if (!isScreen(f) || !existsSync(abs)) continue;
  if (existsSync(snapshot)) {
    try {
      git('diff', '--no-index', '--numstat', snapshot, abs);
    } catch (error) {
      // 차이가 있으면 종료 코드 1 — 출력은 그대로 있다
      const [added, removed] = String(error.stdout).split('\t');
      screenLines += Number(added) + Number(removed) || 0;
    }
  } else if (newFiles.includes(f)) {
    screenLines += readFileSync(abs, 'utf8').split('\n').length;
  } else {
    const range =
      dirty.size > 0 ? ['HEAD', '--', f] : ['HEAD~1', 'HEAD', '--', f];
    const [added, removed] = git('diff', '--numstat', ...range).split('\t');
    screenLines += Number(added) + Number(removed) || 0;
  }
}

const screen = code.filter(isScreen);
const newRoutes = screen.filter((f) => newFiles.includes(f) && isRoute(f));
let tier = '새 화면';
if (code.length === 0) tier = '문서·설정만';
else if (screen.length === 0) tier = '코드';
else if (newRoutes.length === 0 && screenLines <= BIG) tier = '화면 수정';

const workspaces = [...new Set(code.map(workspaceOf).filter(Boolean))];
const checks = workspaces.length
  ? workspaces.map((ws) => `pnpm --filter ${ws} typecheck · lint`).join(' / ')
  : 'pnpm typecheck · pnpm lint (바뀐 워크스페이스가 없으면 바뀐 스크립트의 시험)';
const webFiles = code
  .filter((f) => f.startsWith('apps/web/'))
  .map((f) => f.replace('apps/web/', ''));
const relatedTests = [];
if (webFiles.length)
  relatedTests.push(
    `pnpm --filter @team1/web exec vitest related --run ${webFiles.join(' ')}`,
  );
if (code.some((f) => f.startsWith('scripts/')))
  relatedTests.push('pnpm test:hooks');
if (!relatedTests.length) relatedTests.push('관련 테스트 없음');

const DO = {
  '문서·설정만': ['바뀐 문서의 링크·예시 명령이 실제와 맞는지 확인'],
  코드: [
    checks,
    `관련 테스트만: ${relatedTests.join(' / ')}`,
    '코드 기준 대조 (표)',
    '요청 대조',
  ],
  '화면 수정': [
    checks,
    `관련 테스트만: ${relatedTests.join(' / ')}`,
    'pnpm --filter @team1/web build',
    '코드 기준 대조 (표)',
    '요청 대조',
    '바뀐 화면을 직접 열어 확인 — 바뀐 영역과 그 영역을 쓰는 동작 하나. PR 에 스크린샷',
  ],
  '새 화면': [
    checks,
    `관련 테스트만: ${relatedTests.join(' / ')}`,
    'pnpm --filter @team1/web build',
    '코드 기준 대조 (표) — C-29 목적에서 구조로 포함',
    '요청 대조',
    '새 화면을 직접 열어 확인 — 전체 흐름 한 번. PR 에 스크린샷',
    '디자인과 다른 점 적기 (디자인이 없으면 "디자인 없음")',
  ],
};
const DONT = {
  '문서·설정만': ['빌드 · 테스트 · 화면 확인'],
  코드: ['전체 테스트 · 전체 빌드 · E2E · 화면 확인'],
  '화면 수정': [
    '전체 테스트 · E2E · 다른 화면 전수 확인 · 고친 뒤 재확인 때 통과했던 것까지 다시 보기',
  ],
  '새 화면': ['전체 테스트·E2E 는 PR 올리기 직전에만 · 배치·문구부터 손대기'],
};

console.log(`변경 크기: ${tier}`);
console.log(
  `본 범위: ${scope} · 코드 ${code.length}개 (화면 ${screen.length}개 · 새 라우트 ${newRoutes.length}개) · 화면에서 바뀐 줄 ${screenLines}`,
);
const shown = [newRoutes, screen, code].find((list) => list.length > 0) ?? [];
for (const f of shown.slice(0, 8)) console.log(`  - ${f}`);
console.log('해야 하는 것:');
DO[tier].forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
console.log('하지 않는 것:');
DONT[tier].forEach((item) => console.log(`  - ${item}`));
console.log('보고를 낸 뒤: node scripts/change-tier.mjs --mark');
