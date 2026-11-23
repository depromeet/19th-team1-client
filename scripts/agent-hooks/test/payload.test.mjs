// 잡으려는 실패: 두 도구의 입력 모양 차이로 고친 파일을 못 찾아 린트·완료 관문이 조용히 꺼지는 것
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { editedFiles, isCodeFile, shellCommand } from '../lib/payload.mjs';

test('Claude — Edit·Write 의 file_path', () => {
  const input = {
    tool_name: 'Edit',
    cwd: '/repo',
    tool_input: { file_path: '/repo/apps/web/src/a.ts' },
  };
  assert.deepEqual(editedFiles(input), ['/repo/apps/web/src/a.ts']);
});

test('Codex — apply_patch 본문의 파일 줄', () => {
  const patch = [
    '*** Begin Patch',
    '*** Update File: apps/web/src/a.ts',
    '@@',
    '-old',
    '+new',
    '*** Add File: apps/web/src/b.ts',
    '+export const b = 1;',
    '*** Update File: apps/web/src/c.ts',
    '*** Move to: apps/web/src/d.ts',
    '*** End Patch',
  ].join('\n');
  const input = {
    tool_name: 'apply_patch',
    cwd: '/repo',
    tool_input: { command: patch },
  };
  assert.deepEqual(editedFiles(input), [
    '/repo/apps/web/src/a.ts',
    '/repo/apps/web/src/b.ts',
    '/repo/apps/web/src/c.ts',
    '/repo/apps/web/src/d.ts',
  ]);
});

test('파일 수정이 아닌 도구는 빈 목록', () => {
  assert.deepEqual(
    editedFiles({ tool_name: 'Bash', tool_input: { command: 'ls' } }),
    [],
  );
});

test('셸 명령 — 문자열과 배열 모두', () => {
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
  assert.equal(shellCommand({ tool_name: 'Edit', tool_input: {} }), null);
});

test('완료 검사 대상 — 코드만, 문서·설정은 아님', () => {
  assert.equal(isCodeFile('apps/web/src/app/page.tsx'), true);
  assert.equal(isCodeFile('packages/eslint-config/base.mjs'), true);
  assert.equal(isCodeFile('scripts/change-tier.mjs'), true);
  assert.equal(isCodeFile('docs/code-standards.md'), false);
  assert.equal(isCodeFile('apps/web/package.json'), false);
  assert.equal(isCodeFile('AGENTS.md'), false);
});
