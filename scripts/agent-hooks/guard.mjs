// PreToolUse(셸) — 되돌리기 어려운 명령을 실행 전에 걸러낸다.
// - deny: 에이전트는 실행하지 않고 이유를 돌려받는다. 필요하면 사람이 직접 실행한다.
// - ask : Claude 는 한 번 묻고, 승인하면 실행한다. Codex 훅은 묻지 못해서 .codex/rules/team.rules 가 대신 묻는다.
// 훅이 고장 나도 작업이 멈추지 않게, 어떤 오류든 통과시킨다.

import { pathToFileURL } from 'node:url';

import { readInput, respond, shellCommand, tool } from './lib/payload.mjs';

export const RULES = [
  {
    id: 'env-file',
    level: 'deny',
    name: '환경 변수·키 파일을 셸로 읽기',
    pattern:
      /(^|[\s;&|(])(cat|less|more|head|tail|bat|grep|rg|awk|sed|source|\.|xxd|strings|base64|nl|open)\s[^;&|]*?(^|[\s/'"=])(\.env(\.(?!example\b)[\w.-]+)?|[\w.-]+\.(pem|key|p12|p8)|id_(rsa|ed25519))(?=$|[\s'";&|)])/,
    why: '공개 레포라 값이 대화·로그로 새면 바로 교체해야 합니다. 어떤 키가 필요한지는 .env.example 을 보세요.',
  },
  {
    id: 'no-verify',
    level: 'deny',
    name: '커밋·푸시 검사 건너뛰기',
    pattern: /\bgit\b[^;&|]*\s--no-verify\b|\bHUSKY=0\b/,
    why: '린트·커밋 메시지·타입 검사를 건너뜁니다. 검사가 실패하면 원인을 고쳐 주세요.',
  },
  {
    id: 'force-push',
    level: 'deny',
    name: 'lease 없는 강제 푸시',
    pattern:
      /\bgit\b[^;&|]*\bpush\b[^;&|]*(\s--force(?![-\w])|\s-[a-zA-Z]*f\b|\s\+[\w/.-]+)/,
    why: '원격의 남의 커밋을 덮어씁니다. 자기 브랜치에서 --force-with-lease 로만 강제 푸시합니다.',
  },
  {
    id: 'npm-yarn',
    level: 'deny',
    name: 'npm·yarn 으로 패키지 설치',
    pattern:
      /(^|[;&|(]\s*)(npm\s+(i|install|add|ci|uninstall|remove|rm|update)\b|yarn\b|bun\s+(add|install|remove)\b)/,
    why: '이 레포는 pnpm 만 씁니다(lockfile 이 갈라짐). 웹은 pnpm --filter, 앱은 apps/mobile 에서 npx expo install.',
  },
  {
    id: 'push',
    level: 'ask',
    name: '푸시',
    pattern: /\bgit\b[^;&|]*\bpush\b/,
    why: '원격에 올라갑니다. 커밋·푸시·PR 은 사람이 시킬 때만 합니다.',
  },
  {
    id: 'add-package',
    level: 'ask',
    name: '패키지 추가·삭제',
    pattern:
      /\bpnpm\b[^;&|]*\s(add|remove|rm|uninstall|up|update)\b|\bexpo\s+install\b/,
    why: '의존성은 팀이 함께 씁니다. 왜 필요한지 확인한 뒤 추가합니다.',
  },
  {
    id: 'discard',
    level: 'ask',
    name: '작업 트리 되돌리기·stash 버리기',
    pattern:
      /\bgit\b[^;&|]*\b(reset\s+--hard|clean\s+-[a-zA-Z]*f|checkout\s+(--\s+)?\.(\s|$|;|&)|restore\s+(--\w+\s+)*\.(\s|$|;|&)|stash\s+(drop|clear|pop)\b)/,
    why: '커밋 안 된 변경이 사라집니다.',
  },
  {
    id: 'kill-by-name',
    level: 'ask',
    name: '이름으로 프로세스 종료',
    pattern: /(^|[;&|(]\s*|\bsudo\s+)(pkill|killall)\b/,
    why: '같은 이름의 다른 프로세스(사람이 띄운 개발 서버 등)까지 끕니다. 포트로 찾아 PID 로 끄세요.',
  },
  {
    id: 'wide-rm',
    level: 'ask',
    name: '넓은 범위 삭제',
    pattern:
      /\brm\s+(-[a-zA-Z]+\s+)*-[a-zA-Z]*r[a-zA-Z]*\s+(-[a-zA-Z]+\s+)*["']?(~|\/|\$HOME|\.|\*|(\S*\/)?\.git|(\S*\/)?\.claude|(\S*\/)?\.codex)\/?["']?(\s|$|;|&)/,
    why: '홈·루트·현재 폴더·.git·에이전트 설정 폴더를 통째로 지웁니다.',
  },
];

/** heredoc 본문은 실행되는 명령이 아니라 파일·메시지에 쓰는 글이라 검사에서 뺀다 */
export function stripHeredoc(command) {
  return command.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g, ' ');
}

/** 걸린 규칙 중 가장 센 것. 없으면 null */
export function check(command, { forTool = 'claude' } = {}) {
  const text = stripHeredoc(command);
  const hits = RULES.filter((rule) => rule.pattern.test(text));
  const deny = hits.filter((rule) => rule.level === 'deny');
  if (deny.length > 0) return { level: 'deny', hits: deny };
  // Codex 훅은 ask 를 지원하지 않는다 — .codex/rules 가 묻는다
  if (hits.length > 0 && forTool === 'claude') return { level: 'ask', hits };
  return null;
}

function main() {
  const command = shellCommand(readInput());
  if (!command) return;
  const result = check(command, { forTool: tool });
  if (!result) return;
  const names = result.hits.map((rule) => rule.name).join(' · ');
  const why = result.hits.map((rule) => rule.why).join(' ');
  const tail =
    result.level === 'deny'
      ? ' 에이전트는 이 명령을 실행하지 않습니다. 꼭 필요하면 사람에게 직접 실행해 달라고 하세요.'
      : ' 사람이 시킨 일이면 승인해 주세요.';
  respond({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: result.level,
      permissionDecisionReason: `[${names}] ${why}${tail}`,
    },
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    // 통과
  }
}
