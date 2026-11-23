# 19th-team1-client

디프만 19기 1팀 클라이언트 — Expo 앱 안에 Next.js 웹을 웹뷰로 띄우는 구조의 pnpm 모노레포.
백엔드는 서버 파트 레포에서 관리한다.

## 구성

| 경로                     | 내용                                                     |
| ------------------------ | -------------------------------------------------------- |
| `apps/web`               | Next.js 16 (App Router) — 웹뷰로 띄울 화면               |
| `apps/mobile`            | Expo SDK 58 — 웹뷰를 감싸는 앱 셸, 푸시·사진 등 네이티브 |
| `packages/shared`        | 웹과 앱이 함께 쓰는 코드 (브릿지 메시지 타입 등)         |
| `packages/eslint-config` | 공용 ESLint 설정 (Next·Expo 공식 설정 + 팀 규칙)         |

## 처음 시작

```bash
# Node 22.13 이상 (nvm 사용 시)
nvm use

# pnpm 10 — package.json 의 packageManager 버전을 쓴다
corepack enable
pnpm install
```

웹 환경 변수는 `apps/web/.env.example` 을 `apps/web/.env.local` 로 복사해 채운다.

`corepack` 이 `Cannot find matching keyid` 에러를 내면 corepack 이 오래된 것이다:
`npm i -g corepack@latest` 후 다시 실행한다.

## 명령어

| 명령              | 내용                            |
| ----------------- | ------------------------------- |
| `pnpm dev:web`    | 웹 개발 서버 (`localhost:3000`) |
| `pnpm dev:mobile` | Expo 개발 서버                  |
| `pnpm lint`       | 전체 린트                       |
| `pnpm typecheck`  | 전체 타입 검사                  |
| `pnpm build`      | 전체 빌드                       |
| `pnpm test`       | 전체 단위 테스트 (Vitest)       |
| `pnpm test:e2e`   | 웹 E2E 테스트 (Playwright)      |
| `pnpm format`     | 전체 포맷                       |

E2E 를 처음 돌리기 전에 브라우저를 한 번 설치한다:
`pnpm --filter @team1/web exec playwright install chromium webkit`.
E2E 는 3000 에 떠 있는 서버를 그대로 쓴다 — 우리 웹(`pnpm dev:web`)이 떠 있으면 끄지 않아도 된다.
다른 프로젝트가 3000 을 쓰고 있으면 그 화면을 테스트하게 되니 `E2E_PORT=3001 pnpm test:e2e` 로 돌린다.

앱 패키지는 `pnpm add` 대신 `apps/mobile` 에서 `npx expo install <패키지>` 로 설치한다 — SDK 와 맞는 버전을 고른다.

## 협업 규칙

- 브랜치: `<type>/<영어-소문자-하이픈>` — 예) `feat/save-card-list`. type 은 `feat fix refactor style docs chore test ci build perf`
- 커밋: `<type>(<scope>): <한글 내용>` — 예) `feat(web): 저장물 카드 목록 추가`
- 기능 브랜치는 `dev` 에서 따고, PR 대상도 `dev` 다. `main` 으로는 `dev` 에서만 PR 을 올린다.
- `dev`·`main` 에는 직접 푸시할 수 없다. PR 은 2명 승인 후 병합 — `dev` 는 Squash, `main` 은 Merge Commit.
- `dev` 와 맞출 때는 rebase 한다. 강제 푸시는 자기 기능 브랜치에서만.
- PR 제목은 병합 커밋 제목이 되므로 커밋 규칙대로 쓴다. 배포 PR(`dev` → `main`)은 `release: <배포 내용>`.
- 리뷰 방법: [코드 리뷰 가이드](docs/code-review.md)

커밋할 때 린트·포맷·커밋 메시지, 푸시할 때 브랜치 이름·타입 검사가 자동으로 돈다(Husky).
같은 검사를 PR 에서 CI 가 한 번 더 돈다.

## 에이전트 (Claude Code · Codex)

에이전트가 읽는 정본은 [`AGENTS.md`](AGENTS.md), 사람용 사용법은 [`docs/agent-guide.md`](docs/agent-guide.md).
위험한 명령 차단, 수정 직후 린트, 완료 검사가 훅으로 걸린다. Codex 는 처음에 프로젝트 신뢰와 `/hooks` 승인이 필요하다.
코드 기준은 [`docs/code-standards.md`](docs/code-standards.md) (지금은 초안).
