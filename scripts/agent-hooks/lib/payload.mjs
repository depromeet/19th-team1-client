// Claude Code 와 Codex 의 훅 입력 차이를 맞춘다.
// 두 도구 모두 표준 입력으로 JSON 을 주고, 표준 출력 JSON 으로 막거나 되돌려 보낸다.
// - 셸: 둘 다 tool_name "Bash", tool_input.command
// - 파일 수정: Claude 는 Edit·Write·MultiEdit 의 tool_input.file_path,
//   Codex 는 apply_patch 의 tool_input.command(패치 본문) 안 "*** Update File: <경로>" 줄
// 어느 도구에서 불렸는지는 등록할 때 넘기는 --tool=codex 로 안다.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const tool = process.argv.includes('--tool=codex') ? 'codex' : 'claude';

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

const CLAUDE_EDIT_TOOLS = new Set([
  'Edit',
  'Write',
  'MultiEdit',
  'NotebookEdit',
]);
const PATCH_FILE_LINE = /^\*\*\* (?:Update File|Add File|Move to): (.+)$/gm;

/** 이번 도구 호출로 고친 파일 — 절대 경로 */
export function editedFiles(input) {
  const cwd = input.cwd ?? process.cwd();
  if (CLAUDE_EDIT_TOOLS.has(input.tool_name)) {
    const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
    return file ? [path.resolve(cwd, file)] : [];
  }
  if (input.tool_name === 'apply_patch') {
    const patch = String(
      input.tool_input?.command ?? input.tool_input?.input ?? '',
    );
    return [...patch.matchAll(PATCH_FILE_LINE)].map((m) =>
      path.resolve(cwd, m[1].trim()),
    );
  }
  return [];
}

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function repoRoot(cwd) {
  return git(cwd, 'rev-parse', '--show-toplevel');
}

/**
 * 훅 상태 폴더 — git 폴더 안이라 커밋되지 않고 워크트리마다 따로다.
 * 시험은 AGENT_HOOKS_STATE_DIR 로 임시 폴더를 쓴다.
 */
export function stateDir(cwd) {
  const dir =
    process.env.AGENT_HOOKS_STATE_DIR ??
    path.join(git(cwd, 'rev-parse', '--absolute-git-dir'), 'agent-hooks');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2));
}

export function sessionStateFile(cwd, sessionId) {
  return path.join(
    stateDir(cwd),
    `${String(sessionId ?? 'unknown').replace(/[^\w-]/g, '_')}.json`,
  );
}

/** 완료 검사(change-tier.mjs --mark)가 "여기까지 봤다"고 남기는 파일 */
export function reviewMarkFile(cwd) {
  return path.join(stateDir(cwd), 'review-mark.json');
}

/** 파일 내용 지문. 없는 파일(지운 파일)은 'deleted' */
export function fingerprint(absPath) {
  try {
    return createHash('sha1').update(readFileSync(absPath)).digest('hex');
  } catch {
    return 'deleted';
  }
}

/** 완료 검사 대상인 코드 파일 — 문서·설정만 바뀐 변경은 완료 관문을 통과한다 */
export function isCodeFile(relPath) {
  return (
    /^(apps|packages|scripts)\/.+\.(ts|tsx|js|jsx|mjs|cjs|css)$/.test(
      relPath,
    ) && !/(^|\/)(node_modules|\.next|dist)\//.test(relPath)
  );
}
