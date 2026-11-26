// PreToolUse(셸) — 팀에 피해가 가는 명령만 막는다: 공개 레포의 비밀 값 노출 · 검사 건너뛰기 · 남의 커밋 덮기 · 잠금 파일 갈라짐.
// 막힌 명령은 실행되지 않고 이유가 바로 돌아간다 — 확인 창을 띄우지 않아서 세션이 멈춰 기다리지 않는다.
// 자기 작업만 잃는 명령(reset --hard 등)은 각자 설정 몫이라 여기서 다루지 않는다.
// 훅이 고장 나도 작업이 멈추지 않게, 어떤 오류든 통과시킨다.

import { pathToFileURL } from 'node:url';

import { readInput, respond, shellCommand } from './lib/payload.mjs';

export const RULES = [
  {
    id: 'env-file',
    name: '환경 변수·키 파일을 셸로 읽기',
    pattern:
      /(^|[\s;&|(])(cat|less|more|head|tail|bat|grep|rg|awk|sed|source|\.|xxd|strings|base64|nl|open)\s(?:[^;&|\n]*?[\s/'"=])?(\.env(\.(?!example\b)[\w.-]+)?|[\w.-]+\.(pem|key|p12|p8)|id_(rsa|ed25519))(?=$|[\s'";&|)])/m,
    why: '공개 레포라 값이 대화·로그로 새면 바로 교체해야 합니다. 어떤 키가 필요한지는 .env.example 을 보세요.',
  },
  {
    id: 'no-verify',
    name: '커밋·푸시 검사 건너뛰기',
    // commit 의 -n 은 --no-verify 와 같다(push 의 -n 은 dry-run 이라 걸지 않는다)
    pattern:
      /\bgit\b[^;&|\n]*\s--no-verify\b|\bgit\b[^;&|\n]*\bcommit\b[^;&|\n]*\s-[a-zA-Z]*n[a-zA-Z]*(?=\s|$)|\bHUSKY=0\b/m,
    why: '린트·커밋 메시지·타입 검사를 건너뜁니다. 검사가 실패하면 원인을 고쳐 주세요.',
  },
  {
    id: 'force-push',
    name: 'lease 없는 강제 푸시',
    pattern:
      /\bgit\b[^;&|\n]*\bpush\b[^;&|\n]*(\s--force(?![-\w])|\s-[a-zA-Z]*f[a-zA-Z]*(?=\s|$)|\s\+[\w/.-]+)/m,
    why: '원격의 남의 커밋을 덮어씁니다. 자기 브랜치에서 --force-with-lease 로만 강제 푸시합니다.',
  },
  {
    id: 'npm-yarn',
    name: 'npm·yarn·bun 으로 패키지 설치',
    pattern:
      /(?:^|[;&|(\n])\s*(npm\s+(i|install|add|ci|uninstall|remove|rm|update)\b|yarn\b|bun\s+(add|install|remove)\b)/,
    why: '이 레포는 pnpm 만 씁니다(lockfile 이 갈라짐). 웹은 pnpm --filter, 앱은 apps/mobile 에서 npx expo install.',
  },
];

/**
 * heredoc 본문은 실행되는 명령이 아니라 파일·메시지에 쓰는 글이라 검사에서 뺀다.
 * 시작 줄의 나머지(`<<'EOF'; cat .env`)는 실행되므로 남기고, 따옴표 없는 heredoc 은
 * 본문의 명령 치환(`$(…)` · 백틱)이 실행되므로 그것만 남긴다.
 * 셸(`bash` · `sh` · `zsh` · `dash` · `ssh`, 경로로 불러도)에 넘기는 heredoc 은 — 앞에 오든(`bash <<`) 파이프로 받든(`<< … | bash`) — 본문이 실행되므로 빼지 않는다.
 * 다른 인터프리터(`python3 -` · `node`)는 셸 명령이 아니라 보지 않는다 — `node -e` 처럼 이 훅이 다루지 않는 우회다.
 */
// heredoc 본문을 실행하는 것 — 셸(경로로 불러도) · `source` · `eval` · 점 명령
const SHELL_INPUT =
  /(?:^|[\s;&|(/])(?:bash|sh|zsh|dash|ksh|ssh|source|eval)\b|(?:^|[\s;&|(])\.\s/;

export function stripHeredoc(command) {
  return command.replace(
    /([^\n]*?)<<-?\s*(['"]?)(\w+)\2([^\n]*)\n([\s\S]*?)\n\s*\3\b/g,
    (whole, before, quote, _tag, rest, body) => {
      if (SHELL_INPUT.test(`${before} ${rest}`)) return whole;
      const substitutions = quote
        ? []
        : (body.match(/\$\([^)]*\)|`[^`]*`/g) ?? []);
      return `${before} ${rest} ${substitutions.join(' ')} `;
    },
  );
}

// git · gh 명령(명령 자리에 온 것만 — `.git/HEAD` 같은 경로는 아님. 앞에 `이름=값` · `then` · `do` 가 와도 된다) 안의
// 메시지 인자 하나 — 앞부분 · 따옴표 · 내용. 따옴표로 묶인 다른 인자는 통째로 건너뛴다. 작은따옴표 안에는 이스케이프가 없다
const MESSAGE_ARG =
  /((?:^|[;&|(\n])\s*(?:(?:\w+=\S*|then|do|else|time)\s+)*(?:git|gh)\s(?:"[^"]*"|'[^']*'|[^;&|)\n"'])*?\s(?:-[a-zA-Z]*m|--message|--body|--title|--notes|-[bt])[\s=]+)(?:"((?:\\.|[^"\\])*)"|'([^']*)')/;

/**
 * git · gh 의 커밋 메시지 · PR 제목 · 본문 인자(`-m "…"` · `--body "…"` 등)는 글이라 비운다.
 * 메시지 속 `cat .env` · ` -n` 이 명령으로 잘못 걸려 정상 커밋이 막혔다(PR #4 시험 리뷰).
 * 다른 명령의 같은 옵션(`cat -b ".env"`)은 건드리지 않는다.
 * 큰따옴표 안에 명령 치환(`$(…)` · 백틱)이 있으면 셸이 실행하므로, 거기서 멈추고 나머지를 그대로 검사한다(안쪽 따옴표로 메시지 끝을 잘못 잡지 않게).
 */
export function stripMessages(command) {
  let text = command;
  for (
    let match = text.match(MESSAGE_ARG);
    match;
    match = text.match(MESSAGE_ARG)
  ) {
    const [whole, head, doubleQuoted] = match;
    if (doubleQuoted !== undefined && /\$\(|`/.test(doubleQuoted)) break;
    text = text.replace(whole, `${head}_`);
  }
  return text;
}

/** 걸린 규칙 목록. 없으면 null */
export function check(command) {
  // 메시지를 먼저 비운다 — 제목 속 `bash` 같은 글이 heredoc 을 셸로 넘기는 것처럼 보이지 않게
  const text = stripHeredoc(stripMessages(command));
  const hits = RULES.filter((rule) => rule.pattern.test(text));
  return hits.length > 0 ? { level: 'deny', hits } : null;
}

function main() {
  const command = shellCommand(readInput());
  if (!command) return;
  const result = check(command);
  if (!result) return;
  const names = result.hits.map((rule) => rule.name).join(' · ');
  const why = result.hits.map((rule) => rule.why).join(' ');
  const tail =
    ' 에이전트는 이 명령을 실행하지 않습니다. 다른 방법으로 이어 가고, 꼭 필요하면 마지막 보고에 사람이 직접 실행할 명령으로 남기세요.';
  respond({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `[${names}] ${why}${tail}`,
    },
  });
}

// 스크립트로 실행될 때만 — import 될 때(시험 · node -e)는 돌지 않는다
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch {
    // 통과
  }
}
