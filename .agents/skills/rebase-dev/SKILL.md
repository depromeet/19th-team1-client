---
name: rebase-dev
description: 브랜치를 최신 dev 위로 올린다. 앞 PR 이 Squash 병합된 뒤 쌓인 브랜치를 옮기는 것도 포함한다. "dev 에 맞춰", "rebase 해", "앞 PR 병합됐어", "rebase-dev" 같은 요청에 쓴다.
---

# dev 에 맞추기

이 레포는 `dev` 와 맞출 때 merge 가 아니라 rebase 한다. `dev` 는 Squash 병합이다.

1. 커밋 안 된 변경이 있으면 rebase 하지 않고 보고한다(커밋할지 미룰지는 사람이 정한다). 임의로 stash 하지 않는다.
2. `git fetch origin`
3. 경우를 가른다.
   - **보통** — `git rebase origin/dev`
   - **앞 PR 이 Squash 병합됨** (이 브랜치가 앞 PR 브랜치 위에 쌓여 있었음) — 앞 PR 의 커밋들이 `dev` 에 한 커밋으로 들어가 그대로 rebase 하면 같은 변경이 충돌한다.
     ```bash
     git rebase --onto origin/dev <앞 브랜치의 마지막 커밋> <이 브랜치>
     ```
     앞 브랜치의 마지막 커밋은 `git log --oneline origin/<앞 브랜치>` 또는 앞 PR 페이지의 마지막 커밋이다.
4. 충돌이 나면 파일마다 양쪽 의도를 읽고 푼다. 의도가 갈려 하나를 골라야 하면 `git rebase --abort` 로 되돌리고, 갈린 곳과 두 선택지를 보고한다.
5. `pnpm install` (lockfile 이 바뀌었으면) → `pnpm lint && pnpm typecheck`.
6. 이미 푸시한 브랜치면 `git push --force-with-lease`. `--force` 는 쓰지 않는다(훅이 막는다). 푸시는 사람이 시킬 때.
   **앞 PR 이 병합돼 `--onto` 로 옮긴 경우에만** PR 대상을 `dev` 로 바꾼다: `gh pr edit <번호> --base dev`. 앞 PR 이 아직 열려 있으면 대상은 그대로 둔다(바꾸면 앞 PR 의 변경까지 이 PR 에 보인다).
7. 보고 — 새로 들어온 `dev` 변경을 짧게 브리핑한다(이 작업과 겹치는 것 먼저), 푼 충돌, 검사 결과.
