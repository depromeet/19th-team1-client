---
name: pr-main
description: dev 를 main 으로 올리는 배포 PR 을 만든다. 지난 배포 뒤 dev 에 들어온 PR 을 모으고, dev 배포를 확인하고, 배포 PR 템플릿을 채운다. "배포 PR 올려", "main 으로 올려", "릴리스", "pr-main" 같은 요청에 쓴다. 병합(= 운영 배포)은 사람이 한다.
---

# 배포 PR (dev → main)

`main` 에 병합되면 Vercel 이 운영 주소로 배포한다. PR 은 에이전트가 만들고, 병합은 사람이 한다.

1. `git fetch origin`. 지난 배포 뒤 들어온 것을 모은다 — `dev` 는 Squash 병합이라 커밋 하나가 PR 하나다.
   ```bash
   git log --oneline origin/main..origin/dev
   ```
   비어 있으면 올릴 것이 없다고 보고하고 멈춘다.
2. **dev 가 멀쩡한지** — `dev` 의 마지막 커밋 CI 가 통과했는지(`gh run list --branch dev --limit 3`) 본다. 그다음 `verify-dev` 스킬로 dev 배포를 확인한다. 실패가 있으면 PR 을 만들지 않고 보고한다.
3. **바뀐 설정** — 포함된 PR 중 환경 변수(`.env.example`)·의존성·빌드 설정을 바꾼 것을 찾는다.
   ```bash
   git diff --stat origin/main origin/dev -- '**/.env.example' '**/package.json' pnpm-lock.yaml '**/next.config.*' '**/app.json'
   ```
   새 환경 변수가 있으면 Vercel(Production)·EAS 에 넣어야 한다고 본문과 보고에 적는다. 에이전트가 넣지 않는다.
   포함된 PR 이 새 서버 API 나 바뀐 응답에 기대면, 그 서버 변경이 **운영 서버에 먼저 나갔는지** 서버 파트에 확인한다 — 웹이 먼저 나가면 운영 화면이 깨진다. 확인 못 했으면 본문 "배포 전 확인"에 적고 체크하지 않는다.
4. **PR** — `.github/PULL_REQUEST_TEMPLATE/release.md` 를 채운다. 제목은 `release: <배포 내용>` (CI 가 검사).
   ```bash
   gh pr create --base main --head dev --title "release: <배포 내용>" --body-file <채운 본문>
   ```
   - "포함된 PR" — 1번 목록의 PR 번호와 제목. 사용자가 겪는 변화가 있는 것을 위로.
   - "배포 전 확인" — 2·3번에서 한 것만 체크한다. 안 한 것은 비워 둔다.
5. **보고** — PR 링크, 포함된 PR 수, dev 확인 결과, 사람이 할 일(환경 변수, 병합 시점). 병합 뒤에는 `verify-prod` 로 운영을 확인한다.
