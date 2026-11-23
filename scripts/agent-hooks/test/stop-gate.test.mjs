// 잡으려는 실패: 코드를 고치고 검사 없이 "완료"로 끝나는 것, 그리고 반대로 검사를 마쳤거나 한 번 막힌 뒤에도 계속 막혀 끝나지 못하는 것
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { fingerprint } from '../lib/payload.mjs';

const script = path.join(import.meta.dirname, '../stop-gate.mjs');
let repo;
let stateDir;

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'gate-repo-'));
  stateDir = mkdtempSync(path.join(tmpdir(), 'gate-state-'));
  execFileSync('git', ['init', '-q'], { cwd: repo });
  mkdirSync(path.join(repo, 'apps/web/src'), { recursive: true });
  writeFileSync(path.join(repo, 'apps/web/src/a.ts'), 'export const a = 1;\n');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(stateDir, { recursive: true, force: true });
});

function stop(extra = {}) {
  const input = JSON.stringify({ session_id: 's1', cwd: repo, ...extra });
  const out = execFileSync('node', [script], {
    input,
    encoding: 'utf8',
    env: { ...process.env, AGENT_HOOKS_STATE_DIR: stateDir },
  });
  return out ? JSON.parse(out) : null;
}

const writeState = (pending) =>
  writeFileSync(
    path.join(stateDir, 's1.json'),
    JSON.stringify({ pending, injectedRules: [] }),
  );
const writeMark = (files) =>
  writeFileSync(
    path.join(stateDir, 'review-mark.json'),
    JSON.stringify({ files }),
  );

test('코드를 고친 적이 없으면 통과', () => {
  assert.equal(stop(), null);
});

test('고친 코드가 검사 전이면 막는다', () => {
  writeState(['apps/web/src/a.ts']);
  assert.equal(stop()?.decision, 'block');
});

test('같은 변경은 한 번만 막는다 — 두 번째 끝내기는 통과', () => {
  writeState(['apps/web/src/a.ts']);
  assert.equal(stop()?.decision, 'block');
  assert.equal(stop(), null);
});

test('막힌 뒤 파일을 또 고치면 다시 막는다', () => {
  writeState(['apps/web/src/a.ts']);
  stop();
  writeFileSync(path.join(repo, 'apps/web/src/a.ts'), 'export const a = 2;\n');
  assert.equal(stop()?.decision, 'block');
});

test('검사 기록의 지문이 지금 내용과 같으면 통과', () => {
  writeState(['apps/web/src/a.ts']);
  writeMark({
    'apps/web/src/a.ts': fingerprint(path.join(repo, 'apps/web/src/a.ts')),
  });
  assert.equal(stop(), null);
});

test('이미 돌려보낸 턴(stop_hook_active)은 막지 않는다', () => {
  writeState(['apps/web/src/a.ts']);
  assert.equal(stop({ stop_hook_active: true }), null);
});
