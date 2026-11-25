// 잡으려는 실패: 두 도구의 입력 모양 차이로 셸 명령을 못 읽어 위험 명령 검사가 조용히 꺼지는 것
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shellCommand } from '../lib/payload.mjs';

test('셸 명령 — 문자열(Claude)과 배열(Codex) 모두', () => {
  assert.equal(
    shellCommand({ tool_name: 'Bash', tool_input: { command: 'git status' } }),
    'git status',
  );
  assert.equal(
    shellCommand({
      tool_name: 'Bash',
      tool_input: { command: ['git', 'status'] },
    }),
    'git status',
  );
});

test('셸이 아닌 도구는 null', () => {
  assert.equal(shellCommand({ tool_name: 'Edit', tool_input: {} }), null);
});
