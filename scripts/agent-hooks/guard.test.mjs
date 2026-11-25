// 잡으려는 실패: 위험한 명령이 그냥 실행되거나, 평소 쓰는 명령(.env.example 읽기, --force-with-lease)이 막혀 일이 멈추는 것
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

import { check } from './guard.mjs';

const levelOf = (command) => check(command)?.level ?? 'pass';

const CASES = [
  // 막기
  ['cat apps/web/.env.local', 'deny'],
  ['grep API apps/web/.env', 'deny'],
  ['head -5 .env.production', 'deny'],
  ['cat ~/.ssh/id_rsa', 'deny'],
  ['git commit --no-verify -m "x"', 'deny'],
  ['HUSKY=0 git commit -m "x"', 'deny'],
  ['git push --force origin feat/a', 'deny'],
  ['git push origin feat/a -f', 'deny'],
  ['git push origin +feat/a', 'deny'],
  ['npm install zod', 'deny'],
  ['cd apps/web && yarn add zod', 'deny'],
  ['bun add zod', 'deny'],
  // 리뷰에서 나온 우회 — 경로 없이 파일 이름만, 짧은 옵션, 줄바꿈 · 앞 공백, heredoc 시작 줄 · 명령 치환
  ['cat .env.local', 'deny'],
  ['source .env', 'deny'],
  ['git commit -n -m "fix: x"', 'deny'],
  ['git commit -an -m "fix: x"', 'deny'],
  ['git push -fv origin feat/a', 'deny'],
  ['git push -vf origin feat/a', 'deny'],
  ['cd apps/web\nnpm install zod', 'deny'],
  [' npm install zod', 'deny'],
  ["cat <<'EOF'; cat apps/web/.env.local\ntext\nEOF", 'deny'],
  ['cat <<EOF\n$(cat apps/web/.env.local)\nEOF', 'deny'],
  // 셸에 넘기는 heredoc 은 본문이 실행된다 · 메시지를 비워도 그 뒤 명령과 묶은 옵션은 남는다 (PR #4 시험 리뷰)
  ["bash <<'EOF'\nnpm install zod\nEOF", 'deny'],
  ["ssh host <<'EOF'\ncat .env\nEOF", 'deny'],
  ['git commit -m "fix: x" && cat .env', 'deny'],
  ['git commit -nm "fix: x"', 'deny'],
  ['git commit -m "fix: $(cat .env)"', 'deny'],
  ['cat ".env.local"', 'deny'],
  ['cat -b ".env"', 'deny'],
  ['cat -t ".env.local"', 'deny'],
  ["cat <<'EOF' | bash\nnpm install zod\nEOF", 'deny'],
  ["git commit -m 'a\\' && cat .env && echo 'b'", 'deny'],
  ["/bin/bash <<'EOF'\nnpm install zod\nEOF", 'deny'],
  ['git commit -m "$(cat "x" .env)"', 'deny'],
  ['cat .git/HEAD -b ".env"', 'deny'],
  ['echo x && git commit -m "docs: cat .env 안내" && cat .env', 'deny'],
  // 통과 — 자기 작업만 잃는 명령은 팀 훅이 다루지 않는다 (각자 설정 몫)
  ['git push origin feat/a', 'pass'],
  ['git push --force-with-lease origin feat/a', 'pass'],
  ['pnpm --filter @team1/web add zod', 'pass'],
  ['npx expo install expo-camera', 'pass'],
  ['git reset --hard origin/dev', 'pass'],
  ['git checkout .', 'pass'],
  ['git stash drop', 'pass'],
  ['pkill -f next', 'pass'],
  ['rm -rf .git', 'pass'],
  ['rm -rf ~', 'pass'],
  // 통과
  ['cat apps/web/.env.example', 'pass'],
  ['cat .env.example', 'pass'],
  ['git push -n origin feat/a', 'pass'],
  ['git commit -m "fix: x"', 'pass'],
  ['cd apps/web\npnpm install', 'pass'],
  ["cat <<'EOF'\ncat .env 는 쓰지 않는다 — $(cat .env)\nEOF", 'pass'],
  ['cp apps/web/.env.example apps/web/.env.local', 'pass'],
  ['pnpm install', 'pass'],
  ['pnpm --filter @team1/web test', 'pass'],
  ['npx expo start', 'pass'],
  ['git status && git diff', 'pass'],
  ['git checkout -b feat/a', 'pass'],
  ['rm -rf apps/web/.next', 'pass'],
  ['git stash', 'pass'],
  ["git commit -F - <<'EOF'\nfix: --no-verify 안내 문구 수정\nEOF", 'pass'],
  // 메시지 속 글은 명령이 아니다 — 정상 커밋 · PR 이 막혔다 (PR #4 시험 리뷰)
  ['git commit -m "docs: cat .env 안내"', 'pass'],
  ['git commit -m "feat: 옵션 -n 추가"', 'pass'],
  ['cd apps/web && git commit -m "docs: cat .env 안내"', 'pass'],
  ["git commit -am 'docs: grep .env 예시'", 'pass'],
  ['gh pr create --title "x" --body "source .env 대신 .env.example"', 'pass'],
  [
    'gh pr create --title "docs: bash 안내" --body-file - <<\'EOF\'\nsource .env 대신 .env.example\nEOF',
    'pass',
  ],
];

for (const [command, expected] of CASES) {
  test(`${expected}: ${command.split('\n')[0]}`, () => {
    assert.equal(levelOf(command), expected);
  });
}

test('훅 출력 모양 — 두 도구 공통 permissionDecision', () => {
  const script = path.join(import.meta.dirname, 'guard.mjs');
  const input = JSON.stringify({
    tool_name: 'Bash',
    tool_input: { command: 'npm i zod' },
    cwd: '.',
  });
  const out = JSON.parse(
    execFileSync('node', [script], { input, encoding: 'utf8' }),
  );
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
});

test('셸이 아닌 도구는 보지 않는다', () => {
  const script = path.join(import.meta.dirname, 'guard.mjs');
  const input = JSON.stringify({
    tool_name: 'Read',
    tool_input: { file_path: '.env' },
  });
  assert.equal(execFileSync('node', [script], { input, encoding: 'utf8' }), '');
});
