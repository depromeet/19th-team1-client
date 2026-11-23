---
name: pr
description: 사람이 PR 을 올리라고 할 때 쓴다. 브랜치 확인 → 완료 검사 → 커밋 → dev 에 맞추기 → 푸시 → PR 템플릿 채워 올리기 → CodeRabbit 리뷰 요청 댓글까지 한다. "PR 올려", "pr 만들어", "푸시하고 PR" 같은 요청에 쓴다.
---

# PR 올리기

푸시·PR 은 사람이 시킬 때만 한다. 푸시 전에 Claude 는 한 번 확인을 받는다(훅).

1. **브랜치** — `dev` · `main` 위면 멈추고 브랜치를 만든다. 이름은 `<type>/<영어-소문자-하이픈>` (`scripts/check-branch-name.sh`).
2. **완료 검사** — 코드를 고쳤으면 `self-review` 결과가 이번 변경까지 덮는지 본다. 아니면 돌린다.
3. **커밋** — 커밋 안 된 이번 작업이 있으면 `commit` 스킬로.
4. **dev 에 맞추기** — `git fetch origin` 후 `origin/dev` 위로 rebase (`sync` 스킬). 충돌이 나면 멈추고 보고한다.
5. **검사** — `pnpm lint && pnpm typecheck`. 실패하면 고치고 3번으로.
6. **푸시** — 처음이면 `git push -u origin <브랜치>`, rebase 했으면 `git push --force-with-lease`.
7. **PR** — `.github/pull_request_template.md` 를 읽고 칸을 채운다.
   ```bash
   gh pr create --base dev --title "<커밋 규칙대로>" --body-file <채운 본문> --label <type>
   ```
   - 대상은 항상 `dev`. 다른 PR 위에 쌓은 브랜치면 `--base <앞 브랜치>` 로 올리고 본문 "선행 PR" 칸을 채운다.
   - 제목은 병합 커밋 제목이 된다 — `<type>(<scope>): <한글 내용>`. 라벨은 type 과 같게.
   - "확인 방법"은 리뷰어가 그대로 따라 할 명령·경로로. "리뷰 포인트"에 self-review 의 ⚠️ 남김을 옮긴다.
   - 화면이 바뀌었으면 스크린샷이 필요하다고 사람에게 알린다(에이전트가 올릴 수 없으면).
   - 템플릿에 없는 칸을 만들지 않는다. 빈 칸은 템플릿 주석대로 지운다.
8. **AI 리뷰 요청** — 레포 스타가 적어 CodeRabbit 자동 리뷰가 꺼져 있다. PR 을 만든 뒤 댓글을 단다.
   ```bash
   gh pr comment <번호> --body "@coderabbitai review"
   ```
   이미 리뷰한 커밋은 다시 보지 않으므로, 나중에 커밋을 더 올리면 다시 단다.
9. **보고** — PR 링크, 제목, 대상 브랜치, CI 가 돌기 시작했는지, 사람이 할 일(스크린샷, 리뷰어 지정).
