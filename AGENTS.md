# 19th-team1-client — 에이전트 안내

Claude Code 와 Codex 가 함께 읽는 정본이다. `CLAUDE.md` 는 이 파일을 불러오기만 한다.
사람용 설명은 `README.md`, 에이전트 도구 사용법은 `docs/agent-guide.md`.

## 레포 지도

Expo 앱 안에 Next.js 웹을 웹뷰로 띄우는 pnpm 모노레포다. 서버(API)는 서버 파트 레포에 있다.

| 경로                     | 내용                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `apps/web`               | Next.js 16 App Router, `cacheComponents` 켜짐 — 사용자가 보는 화면 대부분 |
| `apps/mobile`            | Expo SDK 58 — 웹뷰를 감싸는 셸. 푸시·사진 같은 네이티브 기능만            |
| `packages/shared`        | 웹과 앱이 함께 쓰는 코드                                                  |
| `packages/eslint-config` | 공용 ESLint 설정                                                          |
| `scripts/agent-hooks`    | 에이전트 훅 (위험 명령 · 수정 직후 린트 · 완료 관문)                      |
| `.agents/skills`         | 스킬 정본 (`.claude/skills` 는 이 폴더를 가리키는 링크)                   |

웹 스택: Tailwind 4 · TanStack Query 5 · Zod 4 · React Hook Form 7 · Vitest + Testing Library · Playwright.
전역 상태 스토어는 두지 않는다 (`useState` · URL 파라미터 · Context).

## 명령어

| 명령                                         | 내용                                       |
| -------------------------------------------- | ------------------------------------------ |
| `pnpm dev:web` / `pnpm dev:mobile`           | 개발 서버                                  |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | 전체 린트 · 타입 검사 · 단위 테스트        |
| `pnpm --filter @team1/web <명령>`            | 웹만 (예: `pnpm --filter @team1/web test`) |
| `pnpm test:e2e`                              | 웹 E2E (Playwright)                        |
| `pnpm test:hooks`                            | 에이전트 훅 시험                           |

- 웹 패키지 추가: `pnpm --filter @team1/web add <패키지>`. 앱 패키지는 `apps/mobile` 에서 `npx expo install <패키지>`.
- npm·yarn 은 쓰지 않는다 (훅이 막는다).
- 공개된 지 7일이 안 된 버전은 설치되지 않는다 (`pnpm-workspace.yaml` 의 `minimumReleaseAge`). 설치가 실패하면 예외를 넣지 말고 사람에게 알린다.

## 일하는 방식

- 시작할 때 한 줄로 적는다: `이렇게 이해했습니다: <하는 것> / <안 하는 것>`.
- 이럴 때만 멈추고 묻는다. 나머지는 가정을 적고 진행한다.
  1. 되돌릴 수 없는 일 (지우기, 원격에 올리기, 남의 브랜치 건드리기)
  2. 고르는 쪽에 따라 다른 화면·동작이 나오는 갈림길
  3. 받은 내용(요청·디자인·API 문서)에 없는 값 — 문구, 숫자, 필드 이름을 지어내지 않는다
- 요청 범위 밖은 고치지 않는다. 기능이 바뀌지 않는 정리(이름, 순서)만 같은 작업에 넣을 수 있다. 큰 파일 쪼개기 같은 구조 변경은 따로 한다.
- 커밋·푸시·PR 은 사람이 시킬 때만 한다. 시키면 `commit` · `pr` 스킬을 따른다.
- 고치기 전에 지금 코드를 읽는다. 옆 파일의 모양을 따르되, "기존 코드도 그렇다"는 기준을 어길 이유가 아니다.
- 실패는 사용자에게 보이게 한다. 조회·저장 실패를 빈 목록이나 무반응으로 그리지 않는다.

## 완료의 정의

- 코드를 고쳤으면 끝내기 전에 `self-review` 스킬을 돌리고 그 결과 표를 보고에 싣는다.
  안 돌리고 끝내려 하면 완료 관문(stop-gate 훅)이 한 번 돌려보낸다. 검사할 필요가 없으면 `검사 생략: <사유>` 를 적는다.
- 결과 표에 ⚠️(어긋남 → 남김)가 있으면 "완료"나 "문제 없음"이라고 쓰지 않는다. 남은 것은 PR 리뷰 포인트로 넘긴다.
- 화면을 바꿨으면 직접 열어 확인한다. 볼 수 없으면 `화면 확인 필요: <이유>` 로 남긴다.

## 보안

- 공개 레포다. 키·토큰·개인 정보를 코드·커밋·PR·로그에 남기지 않는다.
- `NEXT_PUBLIC_` · `EXPO_PUBLIC_` 로 시작하는 값은 번들에 그대로 들어간다 — 비밀을 넣지 않는다.
- `.env*` 파일 내용은 읽지 않는다. 어떤 키가 있는지는 `.env.example` 을 본다.
- 비밀이 샜으면 지우는 것으로 끝나지 않는다. 바로 사람에게 알리고 키를 교체한다.

## 코드 기준

기준 정본은 `docs/code-standards.md` (번호 `C-xx`). 지금은 전부 초안이고 PR 리뷰로 확정한다.
기계(ESLint·훅·CI)가 막는 것은 여기 다시 쓰지 않는다 — `any` · `!` · 이중 단언 · 상위 폴더 상대 경로 · `process.env` 직접 접근 · import 순서.

| 파일                          | 언제 읽나                                   |
| ----------------------------- | ------------------------------------------- |
| `.claude/rules/web.md`        | `apps/web/**` 를 고칠 때                    |
| `.claude/rules/mobile.md`     | `apps/mobile/**` 를 고칠 때                 |
| `.claude/rules/typescript.md` | `.ts` · `.tsx` 를 고칠 때                   |
| `docs/code-standards.md`      | self-review 로 대조할 때, 기준을 더할 때    |
| `docs/decisions/`             | 이미 정한 것을 뒤집고 싶을 때 (먼저 읽는다) |

Claude 는 `paths` 머리말로 위 룰을 자동으로 읽는다. Codex 는 그 영역을 처음 고칠 때 훅이 본문을 넣어 준다.

## 스킬

| 스킬             | 언제                                                   |
| ---------------- | ------------------------------------------------------ |
| `commit`         | 커밋하라고 할 때 — 관심사별로 나눠 커밋                |
| `pr`             | PR 을 올리라고 할 때 — 검사 → 푸시 → PR → AI 리뷰 요청 |
| `sync`           | `dev` 에 맞추라고 할 때, 앞 PR 이 병합된 뒤            |
| `self-review`    | 코드를 고친 작업을 끝내기 전 (완료 검사)               |
| `review-respond` | PR 리뷰 댓글에 대응할 때                               |
| `add-standard`   | 같은 지적이 두 번째 나왔을 때 — 기준 장부에 올림       |

## 협업 규칙 요약

- 브랜치 `<type>/<영어-소문자-하이픈>`, 커밋 `<type>(<scope>): <한글 내용>`. type 은 `feat fix refactor style docs chore test ci build perf`.
- 기능 브랜치는 `dev` 에서 따고 PR 대상도 `dev`. PR 제목은 병합 커밋 제목이 되므로 커밋 규칙대로.
- 리뷰 반영은 로컬에서 고쳐 커밋한다 (GitHub suggestion 버튼 쓰지 않음). 답글 게시와 resolve 는 사람이 한다. 자세히는 `docs/code-review.md`.
- 강제 푸시는 자기 브랜치에서 `--force-with-lease` 로만.

## 실제로 밟은 함정

- **React 두 벌** — 앱과 웹의 React 버전이 다르면 앱이 런타임에 죽는다. 버전은 `pnpm-workspace.yaml` 의 `catalog` 한 곳에서만 바꾼다.
- **`next typegen` 먼저** — 웹 타입 검사는 라우트 타입을 만든 뒤 돈다. `tsc` 만 따로 돌리면 라우트 타입 오류가 난다. `pnpm --filter @team1/web typecheck` 를 쓴다.
- **ESLint 는 실행 위치에서 설정을 찾는다** — 루트에서 `eslint apps/web/...` 를 돌리면 설정을 못 찾는다. 워크스페이스 안에서 돌리거나 `pnpm --filter` 로.
- **corepack `Cannot find matching keyid`** — corepack 이 오래된 것이다. `npm i -g corepack@latest` 는 사람이 직접 실행한다 (훅이 npm 설치를 막는다).
- **Next 문서는 설치된 버전을 본다** — 학습한 Next 와 API 가 다르다. `apps/web/node_modules/next/dist/docs/` 를 먼저 읽는다.
