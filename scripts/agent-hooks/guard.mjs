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
      /(^|[\s;&|(])(cat|less|more|head|tail|bat|grep|rg|awk|sed|source|\.|xxd|strings|base64|nl|open)\s[^;&|]*?(^|[\s/'"=])(\.env(\.(?!example\b)[\w.-]+)?|[\w.-]+\.(pem|key|p12|p8)|id_(rsa|ed25519))(?=$|[\s'";&|)])/,
    why: '공개 레포라 값이 대화·로그로 새면 바로 교체해야 합니다. 어떤 키가 필요한지는 .env.example 을 보세요.',
  },
  {
    id: 'no-verify',
    name: '커밋·푸시 검사 건너뛰기',
    pattern: /\bgit\b[^;&|]*\s--no-verify\b|\bHUSKY=0\b/,
    why: '린트·커밋 메시지·타입 검사를 건너뜁니다. 검사가 실패하면 원인을 고쳐 주세요.',
  },
  {
    id: 'force-push',
    name: 'lease 없는 강제 푸시',
    pattern:
      /\bgit\b[^;&|]*\bpush\b[^;&|]*(\s--force(?![-\w])|\s-[a-zA-Z]*f\b|\s\+[\w/.-]+)/,
    why: '원격의 남의 커밋을 덮어씁니다. 자기 브랜치에서 --force-with-lease 로만 강제 푸시합니다.',
  },
  {
    id: 'npm-yarn',
    name: 'npm·yarn 으로 패키지 설치',
    pattern:
      /(^|[;&|(]\s*)(npm\s+(i|install|add|ci|uninstall|remove|rm|update)\b|yarn\b|bun\s+(add|install|remove)\b)/,
    why: '이 레포는 pnpm 만 씁니다(lockfile 이 갈라짐). 웹은 pnpm --filter, 앱은 apps/mobile 에서 npx expo install.',
  },
];

/** heredoc 본문은 실행되는 명령이 아니라 파일·메시지에 쓰는 글이라 검사에서 뺀다 */
export function stripHeredoc(command) {
  return command.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g, ' ');
}

/** 걸린 규칙 목록. 없으면 null */
export function check(command) {
  const text = stripHeredoc(command);
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    // 통과
  }
}
