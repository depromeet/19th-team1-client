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
| `pnpm format`     | 전체 포맷                       |

앱 패키지는 `pnpm add` 대신 `apps/mobile` 에서 `npx expo install <패키지>` 로 설치한다 — SDK 와 맞는 버전을 고른다.

## 협업 규칙

- 브랜치: `<type>/<영어-소문자-하이픈>` — 예) `feat/save-card-list`. type 은 `feat fix refactor style docs chore test ci build perf`
- 커밋: `<type>(<scope>): <한글 내용>` — 예) `feat(web): 저장물 카드 목록 추가`
- 기능 브랜치는 `dev` 에서 따고, PR 대상도 `dev` 다. `main` 으로는 `dev` 에서만 PR 을 올린다.
- `dev`·`main` 에는 직접 푸시할 수 없다. PR 은 2명 승인 후 병합 — `dev` 는 Squash, `main` 은 Merge Commit.
- `dev` 와 맞출 때는 rebase 한다. 강제 푸시는 자기 기능 브랜치에서만.

커밋할 때 린트·포맷·커밋 메시지, 푸시할 때 브랜치 이름·타입 검사가 자동으로 돈다(Husky).
같은 검사를 PR 에서 CI 가 한 번 더 돈다.
