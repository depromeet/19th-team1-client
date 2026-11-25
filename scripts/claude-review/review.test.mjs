// 잡으려는 실패: diff 밖 줄에 줄 댓글을 달아 GitHub 가 리뷰 전체를 거절하는 것, 또는 달 수 있는 줄을 놓치는 것
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { commentableLines } from './review.mjs';

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
