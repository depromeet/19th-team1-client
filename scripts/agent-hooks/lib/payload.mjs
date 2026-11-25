// Claude Code 와 Codex 의 훅 입력 차이를 맞춘다.
// 두 도구 모두 표준 입력으로 JSON 을 주고, 표준 출력 JSON 으로 막는다.
// 셸 명령은 둘 다 tool_name "Bash", tool_input.command (Codex 는 배열일 수 있다).

import { readFileSync } from 'node:fs';

export function readInput() {
  return JSON.parse(readFileSync(0, 'utf8') || '{}');
}

/** 훅 출력. 아무것도 안 쓰고 끝나면 통과다 */
export function respond(output) {
  process.stdout.write(JSON.stringify(output));
}

export function shellCommand(input) {
  if (input.tool_name !== 'Bash') return null;
  const command = input.tool_input?.command;
  return Array.isArray(command) ? command.join(' ') : (command ?? null);
}
