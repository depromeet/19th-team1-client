---
name: pr-dev
description: 작업 브랜치를 dev 로 PR 올린다. 브랜치 확인 → 커밋 → dev 에 맞추기 → 검사 → 푸시 → PR 템플릿 채워 올리기 → CodeRabbit 리뷰 요청까지 한다. "PR 올려", "pr 만들어", "푸시하고 PR", "pr-dev" 같은 요청에 쓴다. 배포 PR(dev → main)은 pr-main.
---

# dev 로 PR 올리기

푸시·PR 은 사람이 시킬 때만 한다.

1. **브랜치** — `dev` · `main` 위면 멈추고 브랜치를 만든다. 이름은 `<type>/<영어-소문자-하이픈>` (`scripts/check-branch-name.sh`).
2. **커밋** — 커밋 안 된 이번 작업이 있으면 `commit` 스킬로.
3. **dev 에 맞추기** — `rebase-dev` 스킬. 충돌을 못 풀면 멈추고 보고한다.
4. **검사** — `pnpm lint && pnpm typecheck && pnpm test`. `scripts/` 를 고쳤으면 `pnpm test:hooks` 도. 실패하면 고치고 2번으로.
5. **푸시** — 처음이면 `git push -u origin <브랜치>`, rebase 했으면 `git push --force-with-lease`.
6. **PR** — `.github/pull_request_template.md` 를 읽고 칸을 채운다.
   ```bash
   gh pr create --base <대상> --title "<커밋 규칙대로>" --body-file <채운 본문> --label <type>
   ```
   - 대상은 `dev`. 아직 병합 안 된 다른 PR 위에 쌓은 브랜치만 그 앞 브랜치를 대상으로 하고, 본문 "선행 PR" 칸을 채운다(앞 PR 이 병합되면 `rebase-dev` 가 대상을 `dev` 로 바꾼다).
   - 제목은 병합 커밋 제목이 된다 — `<type>(<scope>): <한글 내용>`. 라벨은 type 과 같게.
   - "확인 방법"은 리뷰어가 그대로 따라 할 명령·경로로. PR 을 열면 Vercel 이 미리보기 주소를 PR 에 단다 — 화면이 바뀌었으면 그 주소에서 볼 경로를 적는다.
   - "리뷰 포인트"에 기준(`C-xx`)에서 어긋난 채 남긴 것을 번호와 이유로 적는다.
   - 화면이 바뀌었으면 스크린샷이 필요하다고 사람에게 알린다(에이전트가 올릴 수 없으면).
   - 템플릿에 없는 칸을 만들지 않는다. 빈 칸은 템플릿 주석대로 지운다.
7. **AI 리뷰 요청** — 자동 리뷰가 꺼져 있다(`docs/code-review.md`). PR 을 만든 뒤 댓글을 단다.
   ```bash
   gh pr comment <번호> --body "@coderabbitai review"
   ```
   이미 리뷰한 커밋은 다시 보지 않으므로, 나중에 커밋을 더 올리면 다시 단다.
8. **보고** — PR 링크, 제목, 대상 브랜치, CI·Vercel 미리보기가 돌기 시작했는지, 사람이 할 일(스크린샷, 리뷰어 지정).
