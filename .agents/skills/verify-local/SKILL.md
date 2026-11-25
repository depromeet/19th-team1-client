---
name: verify-local
description: 로컬에서 이번 변경이 실제로 도는지 확인한다. 바뀐 워크스페이스의 검사와 관련 테스트를 돌리고, 화면이 바뀌었으면 로컬 서버에서 그 화면을 휴대폰·데스크톱 크기로 열어 본다. "로컬에서 확인해", "돌려 봐", "verify-local" 같은 요청이나 PR 올리기 전에 쓴다.
---

# 로컬 확인

바뀐 것만 본다. 전체 테스트·전체 화면 회귀는 PR 직전이나 사람이 시킬 때만.

1. **무엇이 바뀌었나** — `git status --short` 와 `git diff --name-only origin/dev...HEAD`. 워크스페이스(`apps/web` · `apps/mobile` · `packages/*` · `scripts`)별로 묶는다.
2. **검사** — 바뀐 워크스페이스만.
   ```bash
   pnpm --filter <워크스페이스> lint
   pnpm --filter <워크스페이스> typecheck
   pnpm --filter @team1/web exec vitest related --run <바뀐 웹 파일>   # 웹 소스를 고쳤으면
   pnpm test:hooks                                                      # scripts/ 를 고쳤으면
   ```
3. **화면** — `apps/web/src` 의 화면 파일(`.tsx` · `.css`)이 바뀌었으면.
   - 서버: `localhost:3000` 에 우리 웹이 떠 있으면 그대로 쓴다. 없으면 `pnpm dev:web` 을 띄우고, 확인이 끝나면 내가 띄운 것만 끈다. 다른 사람이 띄운 서버는 끄지 않는다.
   - 브라우저 도구(Playwright · chrome-devtools 등)로 바뀐 경로를 **휴대폰(390) · 데스크톱(1280)** 두 크기로 연다. 앱은 웹뷰라 휴대폰 크기가 먼저다.
   - 볼 것: 바뀐 영역이 의도대로 보이나 · 그 영역을 쓰는 동작 하나(누르기·입력·이동) · 콘솔 에러 · 가로로 넘치지 않나.
   - 사진을 찍었으면 직접 열어 본다. 찍은 것만으로는 본 것이 아니다.
   - 서버 API 가 없어 볼 수 없는 화면이면 무엇이 없어서 못 봤는지 적는다.
4. **E2E** — `apps/web/e2e/` 의 흐름에 닿는 변경이면 `pnpm test:e2e` (3000 에 다른 프로젝트가 떠 있으면 `E2E_PORT=3001`).
5. **보고** — 돌린 검사와 결과(숫자), 본 화면과 크기, 못 본 것과 이유. 고친 것이 있으면 무엇을 고쳤는지.
