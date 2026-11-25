// Claude 리뷰 — Agent SDK 로 리뷰하고(review), 지적을 PR 줄 댓글로 단다(post). 결정 기록 0005.
// 두 단계를 나눈 이유: review 는 API 키만, post 는 GitHub 토큰만 받는다.
//
//   node scripts/claude-review/review.mjs review   # .claude-review/review.diff → .claude-review/result.json
//   node scripts/claude-review/review.mjs post     # result.json → PR 리뷰 하나(줄 댓글들)
//
// review 의 SDK 는 CI 가 레포 밖 임시 폴더에 고정 버전으로 설치하고 CLAUDE_AGENT_SDK 로 경로를 준다
// (플랫폼별 실행 파일이 커서 레포 의존성에 넣지 않는다). 로컬에서는 그 경로만 주면 같은 리뷰가 돈다.

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIR = '.claude-review';
const SEVERITIES = ['필수', '제안', '질문'];

const SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '레포 기준 파일 경로' },
          line: {
            type: 'integer',
            description: '바뀐 파일의 실제 줄 번호(diff 의 + 쪽)',
          },
          severity: { type: 'string', enum: SEVERITIES },
          kind: { type: 'string', description: '`C-xx` 또는 `결함`' },
          title: { type: 'string', description: '한 줄 요지' },
          body: { type: 'string', description: '근거 → 고치는 법, 두세 줄' },
        },
        required: ['path', 'line', 'severity', 'kind', 'title', 'body'],
      },
    },
    summary: { type: 'string', description: '다섯 줄 안의 요약' },
  },
  required: ['findings', 'summary'],
};

/** diff 에서 파일마다 댓글을 달 수 있는 줄(+ 쪽의 추가 · 문맥 줄) */
export function commentableLines(diff) {
  const lines = new Map();
  let file = null;
  let line = 0;
  for (const text of diff.split('\n')) {
    if (text.startsWith('+++ ')) {
      file = text === '+++ /dev/null' ? null : text.slice(6);
      if (file) lines.set(file, new Set());
    } else if (text.startsWith('@@')) {
      line = Number(/\+(\d+)/.exec(text)?.[1] ?? 0);
    } else if (file && (text.startsWith('+') || text.startsWith(' '))) {
      lines.get(file).add(line);
      line += 1;
    }
  }
  return lines;
}

async function review() {
  const sdkPath = process.env.CLAUDE_AGENT_SDK;
  if (!sdkPath) throw new Error('CLAUDE_AGENT_SDK 에 SDK 경로를 준다');
  const { query } = await import(pathToFileURL(sdkPath).href);
  const prompt = [
    '.github/claude-review.md 를 읽고 그대로 리뷰한다.',
    `레포: ${process.env.REPO} · PR #${process.env.PR}`,
    `범위(${process.env.KIND}, ${process.env.RANGE}): ${DIR}/review.diff`,
    `이미 달린 줄 댓글: ${DIR}/existing.jsonl (같은 줄 · 같은 내용이면 다시 달지 않는다)`,
    '지적은 댓글로 달지 않고 정해진 출력 형식의 findings 로만 낸다. summary 가 요약이다.',
  ].join('\n');

  let result = null;
  for await (const message of query({
    prompt,
    options: {
      model: process.env.REVIEW_MODEL ?? 'sonnet',
      maxTurns: Number(process.env.REVIEW_MAX_TURNS ?? 25),
      // 읽기 도구만 — 셸 · 쓰기 · 웹은 주지 않는다
      tools: ['Read', 'Grep', 'Glob'],
      allowedTools: ['Read', 'Grep', 'Glob'],
      permissionMode: 'dontAsk',
      // 레포 설정(훅 · CLAUDE.md)을 읽지 않는다 — 지시문이 AGENTS.md 를 직접 읽게 한다
      settingSources: [],
      outputFormat: { type: 'json_schema', schema: SCHEMA },
    },
  })) {
    if (message.type === 'result') result = message;
  }

  const output = result?.structured_output ?? {};
  const failed = !result || result.is_error || result.subtype !== 'success';
  writeFileSync(
    `${DIR}/result.json`,
    JSON.stringify(
      {
        ok: !failed,
        error: failed
          ? String(result?.result ?? result?.errors?.join(' · ') ?? '결과 없음')
          : null,
        summary: output.summary ?? '',
        findings: Array.isArray(output.findings) ? output.findings : [],
        cost: result?.total_cost_usd ?? 0,
        turns: result?.num_turns ?? 0,
        usage: result?.usage ?? {},
      },
      null,
      2,
    ),
  );
  console.log(
    `리뷰 ${failed ? '실패' : '끝'} · 지적 ${output.findings?.length ?? 0} · $${(result?.total_cost_usd ?? 0).toFixed(4)} · 턴 ${result?.num_turns ?? 0}`,
  );
}

async function post() {
  const { REPO, PR, AFTER, GH_TOKEN } = process.env;
  const result = JSON.parse(readFileSync(`${DIR}/result.json`, 'utf8'));
  const lines = commentableLines(readFileSync(`${DIR}/review.diff`, 'utf8'));
  const existing = readFileSync(`${DIR}/existing.jsonl`, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((row) => JSON.parse(row));

  const comments = [];
  const outside = [];
  for (const finding of result.findings) {
    const head = `[${finding.severity}] [${finding.kind}] ${finding.title}`;
    const duplicate = existing.some(
      (c) =>
        c.path === finding.path &&
        c.line === finding.line &&
        c.body?.startsWith(head),
    );
    if (duplicate) continue;
    if (lines.get(finding.path)?.has(finding.line)) {
      comments.push({
        path: finding.path,
        line: finding.line,
        side: 'RIGHT',
        body: `${head}\n\n${finding.body}`,
      });
    } else {
      // diff 밖 줄에는 GitHub 가 댓글을 받지 않는다(리뷰 전체가 거절됨) — 요약으로 옮긴다
      outside.push(`- \`${finding.path}:${finding.line}\` ${head}`);
    }
  }

  if (comments.length > 0) {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/pulls/${PR}/reviews`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${GH_TOKEN}`,
          accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          commit_id: AFTER,
          event: 'COMMENT',
          body: `Claude 리뷰 — 줄 댓글 ${comments.length}개`,
          comments,
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        `리뷰 게시 실패 ${response.status}: ${await response.text()}`,
      );
  }
  writeFileSync(`${DIR}/outside.md`, outside.join('\n'));
  console.log(`줄 댓글 ${comments.length} · 줄 밖 ${outside.length}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const mode = process.argv[2];
  await (mode === 'review'
    ? review()
    : mode === 'post'
      ? post()
      : Promise.reject(new Error('review 또는 post')));
}
