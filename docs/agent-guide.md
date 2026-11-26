# 에이전트 사용 가이드

Claude Code 와 Codex 로 이 레포를 작업할 때 무엇이 자동으로 걸리고, 처음에 무엇을 해야 하는지 정리한다.
에이전트가 읽는 정본은 루트 `AGENTS.md` 다.

## 이 레포가 정하는 것과 각자 정하는 것

이 레포에는 **어기면 팀원이 피해를 보는 것만** 둔다. 일하는 절차는 각자 정한다.

| 레포가 정함 (모두에게 걸림)                                   | 각자 정함 (개인 `~/.claude` 등)                   |
| ------------------------------------------------------------- | ------------------------------------------------- |
| 코드 기준 장부 · 경로별 룰 · ESLint · CI                      | 완료 검사 절차, 화면 확인 방법, 보고 형식         |
| 위험 명령 막기 4개 (`.env` · 검사 건너뛰기 · 강제 푸시 · npm) | 자기 작업만 잃는 명령(`reset --hard` 등)을 막을지 |
| 커밋·PR·리뷰 규칙과 그 스킬                                   | 권한 모드(확인 창을 띄울지), 워크트리, 알림       |

걸리는 세기는 이 순서로 약해진다: ESLint·CI(매번 막음) → 막기 훅(에이전트 명령만) → `AGENTS.md`·룰·장부(읽었을 때 지켜짐).

## 처음 한 번

### Claude Code

- 레포 루트에서 `claude` 를 실행한다. 설정(`.claude/settings.json`)·룰·스킬이 자동으로 잡힌다.
- 처음 열면 이 폴더를 신뢰할지 묻는다 — 신뢰해야 훅이 돈다.
- 확인: 새 세션에서 `/hooks` 에 PreToolUse 훅 1개, 스킬 목록에 `commit` 등이 보이면 된다.

### GitHub CLI

- 이슈 · PR 을 만드는 스킬(`issue` · `pr-dev` · `pr-main`)은 `gh` 를 쓴다. `gh auth status` 로 로그인을 확인하고, 안 돼 있으면 사람이 `gh auth login` 을 한 번 한다(브라우저 로그인이라 에이전트가 대신 못 한다).

### Codex

- 레포 루트에서 `codex` 를 실행한다. 프로젝트를 **신뢰(trust)** 로 둬야 `.codex/` 를 읽는다.
- `/hooks` 에서 훅을 **승인**한다. 훅 파일이 바뀌면 다시 승인해야 돈다 (PR 로 훅이 바뀌었다는 공지가 오면 다시 승인).
- 스킬은 `.agents/skills/` 에서 읽는다.
- Codex 는 경로별 룰(`.claude/rules/*.md`)을 자동으로 읽지 않는다. `AGENTS.md` 의 "코드 기준" 표대로, 그 영역을 고치기 전에 룰 파일을 읽는다.

### Windows

`.claude/skills` 는 `.agents/skills` 를 가리키는 심볼릭 링크다. Windows 에서는 `git config core.symlinks true` 와 개발자 모드가 필요하다.
안 되면 알려 주세요 — 복사본 방식으로 바꾼다.

## 자동으로 걸리는 것 — 위험 명령 막기 (`scripts/agent-hooks/guard.mjs`)

에이전트가 셸 명령을 실행하려는 순간에만 걸린다. 사람이 터미널에서 직접 치는 명령에는 영향이 없다.
확인 창을 띄우지 않고 바로 거절하므로, 권한을 풀고 쓰는 세션도 멈춰 기다리지 않는다.

| 막는 것                    | 예                                            | 대신                                   |
| -------------------------- | --------------------------------------------- | -------------------------------------- |
| `.env`·키 파일을 셸로 읽기 | `cat .env.local` · `grep KEY .env`            | 어떤 키가 필요한지는 `.env.example`    |
| 검사 건너뛰기              | `git commit --no-verify` · `-n` · `HUSKY=0`   | 실패 원인을 고친다                     |
| lease 없는 강제 푸시       | `git push --force` · `-f` · `-fv` · `+브랜치` | `git push --force-with-lease`          |
| npm·yarn·bun 설치          | `npm install zod`                             | `pnpm --filter …` · `npx expo install` |

- `.env` · `.env.local` · `.env.*.local` · `.env.development` · `.env.production` · `.env.test` · `.env.staging` 과 키 파일(`*.pem` · `*.key`)은 Claude 의 파일 읽기 도구로도 열리지 않는다(`permissions.deny`). `.env.example` 은 열린다. 셸로 읽기는 이름과 상관없이 `.env.*`(example 제외)를 막는다.
- 셸 막기는 **읽기 명령**(`cat` · `less` · `head` · `tail` · `grep` · `rg` · `sed` · `awk` · `source` · `base64` 등)으로 여는 것만 본다. `node -e` · `python -c` 처럼 프로그램 안에서 파일을 읽는 우회까지 다 막지는 못한다 — 실수로 여는 것을 막는 장치이지 완전한 차단이 아니다.
- 위 막기와 deny 는 Claude 의 권한 우회 모드에서도 걸린다(Claude Code 문서: 훅은 모든 권한 모드에서 먼저 돌고, deny 규칙은 우회 모드에서도 막는다).
- 개인적으로 훅을 끄고 싶으면 `.claude/settings.local.json` 에 `"disableAllHooks": true` — 막기까지 전부 꺼지니 권하지 않는다.

## 자주 쓰는 요청

작업은 이슈에서 시작한다 — 에이전트에게 고치거나 만들 일을 맡기면 `issue` 스킬이 먼저 돈다. PR 본문의 `close #번호` 로 이슈가 연결되고, `dev` 에 병합되면 이슈가 닫힌다(결정 기록 0006).

| 이렇게 말하면                 | 스킬             | 하는 일                                                                      |
| ----------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| 작업 요청("…고쳐", "…만들어") | `issue`          | 작업 전에 템플릿대로 이슈 — 같은 작업의 열린 이슈가 있으면 그것을 씀         |
| "커밋해"                      | `commit`         | 이번 작업 파일만 관심사별로 커밋                                             |
| "PR 올려"                     | `pr-dev`         | dev 에 맞추기 → 검사 → 푸시 → 템플릿 채워 PR                                 |
| "dev 에 맞춰" / 앞 PR 병합    | `rebase-dev`     | rebase (앞 PR Squash 병합이면 `--onto`)                                      |
| "배포 PR 올려"                | `pr-main`        | 지난 배포 뒤 PR 모으기 → dev 확인 → `release:` PR (병합은 사람)              |
| "로컬에서 확인해"             | `verify-local`   | 바뀐 워크스페이스 검사 · 바뀐 것을 쓰는 곳 · 바뀐 화면을 휴대폰·데스크톱으로 |
| "dev 에서 확인해"             | `verify-dev`     | dev 배포·PR 미리보기에서 바뀐 화면 · 콘솔 · API 호출                         |
| "운영 확인해"                 | `verify-prod`    | 운영 주소에서 읽기만 하며 확인                                               |
| "리뷰 반영해"                 | `review-respond` | 안 닫힌 스레드를 검증 · 분류 → 고친 뒤 답글 초안(게시 · resolve 는 사람)     |

## Claude 리뷰

- `dev` 로 가는 PR 을 열면 Claude 가 리뷰하고, 커밋을 더 올리면 그 커밋분만 다시 본다(`.github/workflows/claude-review.yml`, 지시문 `.github/claude-review.md`).
- 처음 한 번(레포 관리자): Claude Console 에서 리뷰 전용 API 키를 만들고 월 한도를 건 뒤 `gh secret set ANTHROPIC_API_KEY -R depromeet/19th-team1-client` 로 넣는다. 키는 채팅·커밋에 붙이지 않는다.
- 비용: PR 댓글 "Claude 리뷰 비용"에 리뷰마다 한 줄(비용 · 토큰 · 턴), 월 합계는 Console 의 키 사용량.
- 로컬 사전 리뷰: PR 을 올리기 전에 `claude -p "$(cat .github/claude-review.md) 범위: git diff origin/dev...HEAD — 지적 목록만 출력" --allowedTools "Bash(git diff:*),Read,Grep,Glob"` — 구독 사용량으로 돌고, 걸린 것을 먼저 고치면 PR 리뷰가 짧아진다.

## 배포 (Vercel)

| 브랜치 | 주소                                                         |
| ------ | ------------------------------------------------------------ |
| `dev`  | https://19th-team1-client-git-dev-sik02s-projects.vercel.app |
| `main` | https://19th-team1-client.vercel.app (운영)                  |
| PR     | PR 마다 Vercel 이 미리보기 주소를 댓글로 단다                |

- 루트 `apps/web`. `dev`·`main` 에 병합되거나 PR 에 푸시하면 자동으로 배포된다.
- Vercel 프로젝트 관리자: @sikkzz — 환경 변수 · 도메인 · 빌드 로그 · 되돌리기는 관리자에게 요청한다.
- 환경 변수를 새로 쓰면 `.env.example` 에 적고 PR 본문에 알린다. Vercel 에는 관리자가 넣는다.

## 코드 기준 장부

`docs/code-standards.md` — 지금은 전부 **초안**이다. 리뷰에서 항목마다 동의·반대를 달아 주세요.
리뷰 코멘트에서 번호로 인용하면(`C-17`) 에이전트도 같은 번호로 찾아 고친다.
기준을 더하거나 바꾸려면 장부를 고치는 PR 을 올린다.

## 훅·스킬을 고칠 때

- 훅을 고치면 `pnpm test:hooks` 로 시험한다. 걸려야 하는 명령과 걸리면 안 되는 명령을 짝으로 더한다. CI 도 같은 시험을 돈다.
- 막기를 더할 때는 "어기면 팀원이 피해를 보는가"를 먼저 본다. 자기 작업만 잃는 명령은 넣지 않는다.
- 스킬은 `.agents/skills/` 만 고친다 (`.claude/skills` 는 링크).
- 훅을 바꾼 PR 은 Codex 사용자에게 다시 승인해야 한다고 알린다.
