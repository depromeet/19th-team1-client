// 잡으려는 실패: 위험한 명령이 그냥 실행되거나, 평소 쓰는 명령(.env.example 읽기, --force-with-lease)이 막혀 일이 멈추는 것
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

import { check } from '../guard.mjs';

const levelOf = (command, forTool) =>
  check(command, { forTool })?.level ?? 'pass';

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
  // 묻기
  ['git push origin feat/a', 'ask'],
  ['git push --force-with-lease origin feat/a', 'ask'],
  ['pnpm --filter @team1/web add zod', 'ask'],
  ['npx expo install expo-camera', 'ask'],
  ['git reset --hard origin/dev', 'ask'],
  ['git checkout .', 'ask'],
  ['git stash drop', 'ask'],
  ['pkill -f next', 'ask'],
  ['rm -rf .git', 'ask'],
  ['rm -rf ~', 'ask'],
  // 통과
  ['cat apps/web/.env.example', 'pass'],
  ['cp apps/web/.env.example apps/web/.env.local', 'pass'],
  ['pnpm install', 'pass'],
  ['pnpm --filter @team1/web test', 'pass'],
  ['npx expo start', 'pass'],
  ['git status && git diff', 'pass'],
  ['git checkout -b feat/a', 'pass'],
  ['rm -rf apps/web/.next', 'pass'],
  ['git stash', 'pass'],
  ["git commit -F - <<'EOF'\nfix: --no-verify 안내 문구 수정\nEOF", 'pass'],
];

for (const [command, expected] of CASES) {
  test(`${expected}: ${command.split('\n')[0]}`, () => {
    assert.equal(levelOf(command, 'claude'), expected);
  });
}

test('Codex 에서는 묻기 규칙을 훅이 다루지 않는다 (.codex/rules 몫)', () => {
  assert.equal(levelOf('git push origin feat/a', 'codex'), 'pass');
  assert.equal(levelOf('git push --force origin feat/a', 'codex'), 'deny');
});

test('훅 출력 모양 — 두 도구 공통 permissionDecision', () => {
  const script = path.join(import.meta.dirname, '../guard.mjs');
  const input = JSON.stringify({
    tool_name: 'Bash',
    tool_input: { command: 'npm i zod' },
    cwd: '.',
  });
  const out = JSON.parse(
    execFileSync('node', [script, '--tool=codex'], { input, encoding: 'utf8' }),
  );
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
});

test('셸이 아닌 도구는 보지 않는다', () => {
  const script = path.join(import.meta.dirname, '../guard.mjs');
  const input = JSON.stringify({
    tool_name: 'Read',
    tool_input: { file_path: '.env' },
  });
  assert.equal(execFileSync('node', [script], { input, encoding: 'utf8' }), '');
});
