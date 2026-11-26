// 잡으려는 실패: diff 밖 줄에 줄 댓글을 달아 GitHub 가 리뷰 전체를 거절하는 것, 달 수 있는 줄을 놓치는 것, 댓글이 매번 다른 모양으로 나가는 것
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  commentableLines,
  formatFinding,
  formatSummary,
  redact,
} from './review.mjs';

const DIFF = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -10,3 +10,4 @@ function x() {
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 return a;
diff --git a/gone.ts b/gone.ts
--- a/gone.ts
+++ /dev/null
@@ -1,1 +0,0 @@
-x
diff --git a/new.ts b/new.ts
--- /dev/null
+++ b/new.ts
@@ -0,0 +1,2 @@
+one
+two
`;

test('+ 쪽 추가 · 문맥 줄만 고른다 — 지운 줄은 번호를 늘리지 않는다', () => {
  const lines = commentableLines(DIFF);
  assert.deepEqual([...lines.get('a.ts')], [10, 11, 12, 13]);
});

test('지운 파일은 댓글을 달 수 없고, 새 파일은 1번 줄부터', () => {
  const lines = commentableLines(DIFF);
  assert.equal(lines.has('gone.ts'), false);
  assert.deepEqual([...lines.get('new.ts')], [1, 2]);
});

const FINDING = {
  path: 'scripts/agent-hooks/guard.mjs',
  line: 65,
  severity: '필수',
  kind: '결함',
  title: '`.env` 를 읽는 명령이 막히지 않는다',
  repro: 'cat .git/HEAD -b ".env"',
  happens: '막혀야 하는데 통과하고 `.env` 내용이 출력된다.',
  cause: '경로 속 `.git` 의 git 을 git 명령으로 잘못 알아본다.',
  fix: 'git · gh 는 명령 자리에 올 때만 명령으로 본다.',
  fixCode: '',
};

test('줄 댓글은 결과 → 재현(코드 블록) → 원인 → 고치기 순서', () => {
  const body = formatFinding(FINDING);
  assert.match(
    body,
    /^\*\*🔴 필수 · 결함\*\* — `\.env` 를 읽는 명령이 막히지 않는다/,
  );
  assert.ok(body.indexOf('**재현**') < body.indexOf('**원인**'));
  assert.ok(body.indexOf('**원인**') < body.indexOf('**고치기**'));
  assert.match(body, /```\ncat \.git\/HEAD -b "\.env"\n```/);
  assert.ok(!body.includes('```\n\n```'), '빈 고친 코드 칸은 그리지 않는다');
});

test('요약은 결론 한 줄과 지적 표, diff 밖 지적은 접은 칸에 전문', () => {
  const summary = formatSummary(
    { findings: [FINDING], scope: 'PR 전체', checked: '' },
    new Set(['scripts/agent-hooks/guard.mjs:65']),
  );
  assert.match(
    summary,
    /^\*\*필수 1 · 제안 0 · 질문 0\*\* — 병합 전에 1건 고칠 것/,
  );
  assert.match(
    summary,
    /\| 🔴 필수 \| `\.env` 를 읽는 명령이 막히지 않는다 \|/,
  );
  assert.match(summary, /<details>[\s\S]*\*\*원인\*\*/);
  assert.equal(
    formatSummary({ findings: [], scope: 'x', checked: '' }).split('\n')[0],
    '**지적 없음**',
  );
});

test('키 모양 글자는 공개 댓글에 나가기 전에 가린다', () => {
  assert.equal(
    redact(
      '키는 sk-ant-api03-abcdefghijkl 이고 토큰은 ghp_abcdefghijklmnopqrstuvwxyz0123',
    ),
    '키는 [가림] 이고 토큰은 [가림]',
  );
});
