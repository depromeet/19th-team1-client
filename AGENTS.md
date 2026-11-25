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
| `scripts/agent-hooks`    | 위험 명령 막기 훅 (Claude · Codex 공통)                                   |
| `.agents/skills`         | 스킬 정본 (`.claude/skills` 는 이 폴더를 가리키는 링크)                   |

웹 스택: Tailwind 4 · TanStack Query 5 · Zod 4 · React Hook Form 7 · Vitest + Testing Library · Playwright.
전역 상태 스토어는 두지 않는다 (`useState` · URL 파라미터 · Context).

## 관련 레포

| 레포                                                                                 | 무엇                                                                                               | 언제 읽나                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`depromeet/19th-team1-spec`](https://github.com/depromeet/19th-team1-spec) `PRD.md` | 기획 정본. 요구사항 ID(`C·O·H·R·N·P-번호`) · 상태(확정·논의·보류) · 범위 밖 · 열린 질문(`OQ-번호`) | 기능·화면을 만들기 전                   |
| [`depromeet/19th-team1-server`](https://github.com/depromeet/19th-team1-server)      | 서버(API). 규칙은 `.claude/rules/api.md`, 문서는 `docs/`                                           | API 를 붙이기 전, 응답이 예상과 다를 때 |

GitHub 에서 읽거나(`gh api repos/depromeet/<레포>/contents/<경로>`) 옆 폴더에 받아 읽는다. 두 레포는 읽기만 한다 — 고칠 것이 있으면 사람에게 알린다.

**기획(PRD)**

- `확정` 인 요구사항만 만든다. `논의` 이거나 열린 질문(OQ)에 걸린 것은 만들기 전에 사람에게 묻는다. "범위 밖"은 만들지 않는다.
- PRD 에 없는 화면 문구·기능·필드를 지어내지 않는다. 디자인 시안이 있으면 시안이 문구의 정본이다.
- PR 본문에 관련 요구사항 ID 를 적는다.
- PRD 는 아직 기획 레포의 PR([#1](https://github.com/depromeet/19th-team1-spec/pull/1))로 올라가 있다 — 병합 전에는 그 PR 의 `PRD.md` 를 본다.

**서버(API)**

- 경로는 `/api/v1/...`. 성공 응답은 `{ "data": … }`, 실패 응답은 `{ "code": "…", "message": "…" }` — 웹 `src/lib/api` 가 이 모양을 가정한다. 서버 쪽 모양이 바뀌면 `client.ts` · `api-error.ts` 도 같이 바꾼다.
- 엔드포인트·필드가 없거나 다르면 지어내지 않고 서버 파트에 묻는다. 응답 스키마(C-51)는 서버 응답 DTO 를 보고 쓴다.

## 명령어

| 명령                                         | 내용                                       |
| -------------------------------------------- | ------------------------------------------ |
| `pnpm dev:web` / `pnpm dev:mobile`           | 개발 서버                                  |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | 전체 린트 · 타입 검사 · 단위 테스트        |
| `pnpm --filter @team1/web <명령>`            | 웹만 (예: `pnpm --filter @team1/web test`) |
| `pnpm test:e2e`                              | 웹 E2E (Playwright)                        |
| `pnpm test:hooks`                            | 위험 명령 막기 훅 시험                     |

- 웹 패키지 추가: `pnpm --filter @team1/web add <패키지>`. 앱 패키지는 `apps/mobile` 에서 `npx expo install <패키지>`.
- npm·yarn·bun 은 쓰지 않는다 (훅이 막는다).
- 공개된 지 7일이 안 된 버전은 새로 설치되지 않는다 (`pnpm-workspace.yaml` 의 `minimumReleaseAge`, 잠금 파일에 이미 있는 버전은 예외). 설치가 실패하면 예외를 넣지 말고 사람에게 알린다.

## 팀 코드에서 지킬 것

- 받은 내용(요청·디자인·API 문서)에 없는 값 — 문구, 숫자, 필드 이름을 지어내지 않는다.
- 요청 범위 밖은 고치지 않는다. 기능이 바뀌지 않는 정리(이름, 순서)만 같은 작업에 넣을 수 있다. 큰 파일 쪼개기 같은 구조 변경은 따로 한다.
- **작업 요청은 이슈부터** — PR 로 끝나는 변경을 요청받으면 "이슈 만들어"라고 하지 않아도 `issue` 스킬로 이슈를 먼저 만든다(같은 작업의 열린 이슈가 있으면 그것을 쓴다). 이슈 → 작업 → PR(`close #번호`) → `dev` 병합 때 이슈가 닫힌다. 질문·조사, 열린 PR 의 리뷰 반영, 배포 PR 은 빼고(결정 기록 0006).
- 커밋·푸시·PR 은 사람이 시킬 때만 한다. 시키면 `commit` · `pr-dev` 스킬을 따른다.
- 고치기 전에 지금 코드를 읽는다. 옆 파일의 모양을 따르되, "기존 코드도 그렇다"는 기준을 어길 이유가 아니다.
- 실패는 사용자에게 보이게 한다. 조회·저장 실패를 빈 목록이나 무반응으로 그리지 않는다.

## PR 을 올리기 전

- `pnpm lint` · `pnpm typecheck` · `pnpm test` 가 통과한다. 실패를 숨기거나 검사를 건너뛰지 않는다(`--no-verify` 는 훅이 막는다).
- 기준(`C-xx`)에서 어긋난 채 남긴 것은 PR 본문 "리뷰 포인트"에 번호와 이유로 적는다.
- 화면을 바꿨으면 PR 에 스크린샷을 붙인다. 에이전트가 붙일 수 없으면 사람에게 알린다.
- 완료 검사·화면 확인·보고 방식 같은 작업 절차는 각자 개인 에이전트 설정에 둔다. 이 레포는 결과(코드·PR)의 기준만 정한다.

## 보안

- 공개 레포다. 키·토큰·개인 정보를 코드·커밋·PR·로그에 남기지 않는다.
- `NEXT_PUBLIC_` · `EXPO_PUBLIC_` 로 시작하는 값은 번들에 그대로 들어간다 — 비밀을 넣지 않는다.
- `.env*` 파일 내용은 읽지 않는다. 어떤 키가 있는지는 `.env.example` 을 본다.
- 비밀이 샜으면 지우는 것으로 끝나지 않는다. 바로 사람에게 알리고 키를 교체한다.

## 코드 기준

기준 정본은 `docs/code-standards.md` (번호 `C-xx`). 지금은 전부 초안이고 PR 리뷰로 확정한다.
기계(ESLint·훅·CI)가 막는 것은 여기 다시 쓰지 않는다 — `any` · `!` · 이중 단언 · 객체 모양 `type` · `@ts-ignore` · 상위 폴더 상대 경로 · `process.env` 직접 접근 · import 순서 · `<div onClick>`·이름 없는 아이콘 버튼 · React 훅 규칙(효과 안 setState · 의존성 · 순수성 등, eslint-config-next 경유) · React Query 규칙. 경고도 `--max-warnings=0` 이라 막힌다.
이 중 `@ts-ignore` · import 순서 · `console.log` 는 장부 번호 없이 린트 메시지로 충분하다. 긴 설명과 코드 예시는 장부에 있다. 경로별 룰은 번호와 한 줄만 둔다.

| 파일                          | 언제 읽나                                   |
| ----------------------------- | ------------------------------------------- |
| `.claude/rules/web.md`        | `apps/web/**` 를 고칠 때                    |
| `.claude/rules/mobile.md`     | `apps/mobile/**` 를 고칠 때                 |
| `.claude/rules/typescript.md` | `.ts` · `.tsx` 를 고칠 때                   |
| `docs/code-standards.md`      | 리뷰에서 번호를 볼 때, 기준을 더할 때       |
| `.github/claude-review.md`    | 리뷰 지시문 — 리뷰하거나 리뷰어를 고칠 때   |
| `docs/decisions/`             | 이미 정한 것을 뒤집고 싶을 때 (먼저 읽는다) |

Claude 는 `paths` 머리말로 위 룰을 자동으로 읽는다. **Codex 는 자동으로 읽지 않는다** — 그 영역 파일을 고치기 전에 위 룰 파일을 직접 읽는다.

## 스킬

| 스킬             | 언제                                                           |
| ---------------- | -------------------------------------------------------------- |
| `issue`          | 작업을 요청받으면 먼저 — 템플릿대로 이슈(있으면 그것을 씀)     |
| `commit`         | 커밋하라고 할 때 — 관심사별로 나눠 커밋                        |
| `pr-dev`         | PR 을 올리라고 할 때 — 검사 → 푸시 → `dev` 로 PR               |
| `rebase-dev`     | `dev` 에 맞추라고 할 때, 앞 PR 이 병합된 뒤                    |
| `pr-main`        | 배포 PR(`dev` → `main`)을 만들 때 — 병합(= 운영 배포)은 사람이 |
| `verify-local`   | 로컬에서 바뀐 것만 검사·쓰는 곳·화면 확인                      |
| `verify-dev`     | Vercel `dev` 배포·PR 미리보기에서 확인                         |
| `verify-prod`    | 운영 배포 뒤 확인 — 읽기만                                     |
| `review-respond` | 리뷰 반영하라고 할 때 — 검증 · 분류 → 고침 → 답글 초안         |

## 협업 규칙 요약

- 브랜치 `<type>/<영어-소문자-하이픈>`, 커밋 `<type>(<scope>): <한글 내용>`. type 은 `feat fix refactor style docs chore test ci build perf`.
- 작업은 이슈에서 시작하고, `dev` 로 가는 PR 본문에는 `close #번호` 가 있어야 한다(CI 가 검사).
- 기능 브랜치는 `dev` 에서 따고 PR 대상도 `dev`. PR 제목은 병합 커밋 제목이 되므로 커밋 규칙대로.
- 배포는 Vercel — `dev` 브랜치는 dev 주소, `main` 은 운영 주소, PR 마다 미리보기. 배포 PR(`dev` → `main`) 제목은 `release: <배포 내용>`. 주소는 `docs/agent-guide.md`.
- 리뷰 반영은 로컬에서 고쳐 커밋한다 (GitHub suggestion 버튼 쓰지 않음). 답글 게시와 resolve 는 사람이 한다. 답글 첫 단어는 `반영:` · `반영 안 함:` · `보류:` — 리뷰 사례로 모아 기준을 고친다. 자세히는 `docs/code-review.md`.
- `dev` 로 가는 PR 은 Claude 가 먼저 리뷰한다(커밋을 더 올리면 그 커밋분만). Claude 지적도 코드로 검증한다 — 틀리면 반영하지 않고 이유를 답한다.
- 강제 푸시는 자기 브랜치에서 `--force-with-lease` 로만.

## 실제로 밟은 함정

- **React 두 벌** — 앱과 웹의 React 버전이 다르면 앱이 런타임에 죽는다. 버전은 `pnpm-workspace.yaml` 의 `catalog` 한 곳에서만 바꾼다.
- **`next typegen` 먼저** — 웹 타입 검사는 라우트 타입을 만든 뒤 돈다. `tsc` 만 따로 돌리면 라우트 타입 오류가 난다. `pnpm --filter @team1/web typecheck` 를 쓴다.
- **ESLint 는 실행 위치에서 설정을 찾는다** — 루트에서 `eslint apps/web/...` 를 돌리면 설정을 못 찾는다. 워크스페이스 안에서 돌리거나 `pnpm --filter` 로.
- **corepack `Cannot find matching keyid`** — corepack 이 오래된 것이다. `npm i -g corepack@latest` 는 사람이 직접 실행한다 (훅이 npm 설치를 막는다).
- **Next 문서는 설치된 버전을 본다** — 학습한 Next 와 API 가 다르다. `apps/web/node_modules/next/dist/docs/` 를 먼저 읽는다.
