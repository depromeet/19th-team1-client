---
name: review-respond
description: PR 에 달린 리뷰 댓글(사람·CodeRabbit)에 대응한다. 안 닫힌 스레드를 모아 코드로 검증해 분류표를 만들고, 사람이 고른 것만 로컬에서 고쳐 커밋하고, 답글 초안을 쓴다. 답글 게시와 resolve 는 사람이 한다. "리뷰 반영해", "리뷰 확인해", "코드래빗 댓글 봐" 같은 요청에 쓴다.
---

# 리뷰 대응

규칙은 `docs/code-review.md`. 핵심: 반영은 로컬 커밋으로, 스레드마다 답글, resolve 는 리뷰어(봇 스레드는 작성자).

1. **모으기** — 안 닫힌 스레드만.
   ```bash
   gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved path line comments(first:20){nodes{author{login} body url}}}}}}}' -F o=<owner> -F r=<repo> -F n=<번호>
   ```
2. **검증** — 스레드마다 지적한 코드를 실제로 열어 본다. 지적이 맞는지 코드로 판단한다(봇 지적도 틀릴 수 있다).
3. **분류표** — 사람에게 보여 주고 고르게 한다. 고치기 전에 멈춘다.

   | #   | 누가 | 파일:줄 | 지적 한 줄 | 판단 | 추천 |
   | --- | ---- | ------- | ---------- | ---- | ---- |
   - 판단: `맞음` · `일부 맞음` · `틀림(근거)` · `취향`
   - 추천: `반영` · `반영 안 함(이유)` · `질문으로 답`
   - 머리말이 `[필수]` 면 반영 안 할 때 근거가 특히 필요하다. CodeRabbit `Major` 이상은 대응하고 `Minor` 는 선택.

4. **반영** — 사람이 고른 것만 고친다. 스레드 하나 또는 관심사 하나 = 커밋 하나 (`fix: 리뷰 반영 — <무엇>`). GitHub suggestion 버튼은 쓰지 않는다.
   코드를 고쳤으면 바뀐 워크스페이스의 `lint` · `typecheck` · 관련 테스트를 돌린다. 푸시는 사람이 시킬 때.
5. **답글 초안** — 스레드마다. 반영했으면 커밋 해시와 한 줄, 안 했으면 이유. 게시하지 않고 초안만 준다.
6. **같은 지적이 두 번째면** — 이 PR 이나 앞 PR 에서 같은 종류의 지적이 이미 있었으면 `add-standard` 를 권한다.
7. 커밋을 더 푸시했으면 CodeRabbit 에 다시 리뷰를 요청해야 한다고 알린다(`@coderabbitai review`).
