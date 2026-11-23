// PostToolUse(파일 수정) — 고친 파일을 그 자리에서 Prettier·ESLint 로 맞추고, 남은 린트 오류는 에이전트에게 돌려보낸다.
// - 고친 코드 파일을 세션 상태에 적어 둔다 → stop-gate.mjs 가 완료 검사를 돌렸는지 본다
// - Codex 는 경로별 룰(.claude/rules/*.md)을 자동으로 읽지 않는다 → 그 영역을 처음 고칠 때 룰 본문을 넣어 준다
//   (Claude 는 paths 머리말로 알아서 읽으므로 넣지 않는다)
// 커밋 때 lint-staged 가 같은 검사를 다시 돈다. 여기는 "지금 바로 알려 주기"가 목적이다.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  editedFiles,
  isCodeFile,
  readInput,
  readJson,
  repoRoot,
  respond,
  sessionStateFile,
  tool,
  writeJson,
} from './lib/payload.mjs';

const WORKSPACES = ['apps/web', 'apps/mobile'];
const LINTABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const PRETTIER_ABLE = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|ya?ml|css)$/;

/** 고친 파일 → 그 영역의 경로별 룰 (Codex 에만 넣는다) */
export function rulesFor(relPath) {
  const rules = [];
  if (relPath.startsWith('apps/web/')) rules.push('web');
  if (relPath.startsWith('apps/mobile/')) rules.push('mobile');
  if (/\.(ts|tsx)$/.test(relPath)) rules.push('typescript');
  return rules;
}

function run(bin, args, cwd) {
  try {
    execFileSync(bin, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 50_000,
    });
    return null;
  } catch (error) {
    return (
      `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() ||
      String(error.message)
    );
  }
}

function ruleBody(root, name) {
  const file = path.join(root, '.claude/rules', `${name}.md`);
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf8')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .trim();
}

function main() {
  const input = readInput();
  const files = editedFiles(input);
  if (files.length === 0) return;

  const root = repoRoot(input.cwd ?? process.cwd());
  const stateFile = sessionStateFile(root, input.session_id);
  const state = readJson(stateFile, { pending: [], injectedRules: [] });

  const problems = [];
  const newRules = [];

  for (const abs of files) {
    const rel = path.relative(root, abs);
    if (rel.startsWith('..') || !existsSync(abs)) continue;

    if (PRETTIER_ABLE.test(rel)) {
      run(
        path.join(root, 'node_modules/.bin/prettier'),
        ['--write', '--ignore-unknown', '--log-level=warn', abs],
        root,
      );
    }

    const workspace = WORKSPACES.find((ws) => rel.startsWith(`${ws}/`));
    if (workspace && LINTABLE.test(rel)) {
      const out = run(
        path.join(root, workspace, 'node_modules/.bin/eslint'),
        [
          '--fix',
          '--max-warnings=0',
          path.relative(path.join(root, workspace), abs),
        ],
        path.join(root, workspace),
      );
      if (out) problems.push(`${rel}\n${out}`);
    }

    if (isCodeFile(rel) && !state.pending.includes(rel))
      state.pending.push(rel);

    if (tool === 'codex') {
      for (const name of rulesFor(rel)) {
        if (!state.injectedRules.includes(name) && !newRules.includes(name))
          newRules.push(name);
      }
    }
  }

  state.injectedRules.push(...newRules);
  writeJson(stateFile, state);

  const context = newRules
    .map((name) => ruleBody(root, name))
    .filter(Boolean)
    .join('\n\n---\n\n');

  if (problems.length === 0 && !context) return;
  respond({
    ...(problems.length > 0 && {
      decision: 'block',
      reason:
        'ESLint 오류가 남았습니다(자동 수정이 안 되는 것). 이어지는 수정으로 풀리는 것(아직 안 쓴 import 등)이 아니면 고쳐 주세요.' +
        `\n\n${problems.join('\n\n')}`,
    }),
    ...(context && {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `이 영역을 처음 고쳤습니다. 이 레포의 경로별 기준입니다:\n\n${context}`,
      },
    }),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    // 통과
  }
}
