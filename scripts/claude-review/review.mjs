// Claude 리뷰 — Agent SDK 로 리뷰하고(review), 지적을 PR 줄 댓글로 단다(post). 결정 기록 0005.
// 두 단계를 나눈 이유: review 는 API 키만, post 는 GitHub 토큰만 받는다.
//
//   node scripts/claude-review/review.mjs review   # .claude-review/review.diff → .claude-review/result.json
//   node scripts/claude-review/review.mjs post     # result.json → PR 리뷰 하나(줄 댓글들)
//
// SDK 는 이 폴더의 package.json · pnpm-lock.yaml 로만 설치한다(워크스페이스 밖 — 플랫폼별 실행 파일이 커서
// 팀원 설치에 섞지 않는다). 로컬: pnpm install --dir scripts/claude-review --ignore-workspace --frozen-lockfile

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIR = '.claude-review';
const SEVERITIES = ['필수', '제안', '질문'];

// 모델은 칸만 채우고, 댓글 모양은 formatFinding 이 정한다 — 매번 같은 모양으로 읽히게
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
          kind: {
            type: 'string',
            description:
              '`결함` 또는 장부 번호와 이름(`C-17 로딩은 위에서 끊는다`)',
          },
          title: {
            type: 'string',
            description:
              '무슨 일이 생기나 — 사람이 겪는 결과 한 문장. 코드 · 정규식 없이',
          },
          repro: {
            type: 'string',
            description: '재현 입력(명령 · 코드 그대로). 없으면 빈 문자열',
          },
          happens: {
            type: 'string',
            description:
              '그 입력이면 실제로 어떻게 되나 한 문장. 없으면 빈 문자열',
          },
          cause: {
            type: 'string',
            description: '원인 한 문장 — 코드 · 정규식 없이 동작으로',
          },
          fix: { type: 'string', description: '고치는 법 한두 문장' },
          fixCode: {
            type: 'string',
            description:
              '고친 코드나 더할 시험(그대로 붙일 수 있게). 없으면 빈 문자열',
          },
        },
        required: [
          'path',
          'line',
          'severity',
          'kind',
          'title',
          'repro',
          'happens',
          'cause',
          'fix',
          'fixCode',
        ],
      },
    },
    scope: {
      type: 'string',
      description: '본 범위 한 문장(무엇을 어떤 순서로 봤나)',
    },
    checked: {
      type: 'string',
      description: '지적은 아니지만 확인한 것 한두 문장. 없으면 빈 문자열',
    },
  },
  required: ['findings', 'scope', 'checked'],
};

// 공개 댓글에 키가 섞여 나가지 않게 — PR 안 글이 리뷰어에게 환경 변수를 읽어 적으라고 시킬 수 있다
const SECRET =
  /sk-ant-[\w-]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}/g;
export const redact = (text) => text.replace(SECRET, '[가림]');

const ICON = { 필수: '🔴', 제안: '🟡', 질문: '⚪' };

const fence = (text) => `\`\`\`\n${text.trim()}\n\`\`\``;

/** 지적의 첫 줄 — 중복 확인에도 쓴다 */
export function findingHead(finding) {
  return `**${ICON[finding.severity] ?? ''} ${finding.severity} · ${finding.kind}** — ${finding.title}`;
}

/** 줄 댓글 본문 — 재현 → 원인 → 고치기 */
export function formatFinding(finding) {
  const parts = [findingHead(finding)];
  if (finding.repro?.trim()) {
    parts.push(`**재현**\n${fence(finding.repro)}`);
    if (finding.happens?.trim()) parts.push(finding.happens.trim());
  }
  parts.push(`**원인** ${finding.cause.trim()}`);
  parts.push(`**고치기** ${finding.fix.trim()}`);
  if (finding.fixCode?.trim()) parts.push(fence(finding.fixCode));
  return parts.join('\n\n');
}

/** 요약 댓글 본문 — 결론 한 줄 → 지적 표 → 본 범위 */
export function formatSummary(result, outsidePaths = new Set()) {
  const count = (severity) =>
    result.findings.filter((finding) => finding.severity === severity).length;
  const lines = [];
  if (result.findings.length === 0) {
    lines.push('**지적 없음**');
  } else {
    const must = count('필수');
    lines.push(
      `**필수 ${must} · 제안 ${count('제안')} · 질문 ${count('질문')}**${must > 0 ? ` — 병합 전에 ${must}건 고칠 것` : ''}`,
      '',
      '| | 무슨 일 | 위치 |',
      '| --- | --- | --- |',
      ...result.findings.map((finding) => {
        const where = `\`${finding.path}:${finding.line}\``;
        const mark = outsidePaths.has(`${finding.path}:${finding.line}`)
          ? ' (diff 밖 — 아래)'
          : '';
        return `| ${ICON[finding.severity] ?? ''} ${finding.severity} | ${finding.title.replaceAll('|', '\\|')} | ${where}${mark} |`;
      }),
    );
    const outside = result.findings.filter((finding) =>
      outsidePaths.has(`${finding.path}:${finding.line}`),
    );
    if (outside.length > 0) {
      lines.push(
        '',
        '<details><summary>diff 밖 줄이라 줄 댓글을 달지 못한 지적</summary>',
        '',
        ...outside.map((finding) => formatFinding(finding)),
        '</details>',
      );
    }
  }
  lines.push('', `본 범위: ${result.scope ?? ''}`);
  if (result.checked?.trim()) lines.push(`확인한 것: ${result.checked.trim()}`);
  return lines.join('\n');
}

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
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const prompt = [
    '.github/claude-review.md 를 읽고 그대로 리뷰한다.',
    `레포: ${process.env.REPO} · PR #${process.env.PR}`,
    `범위(${process.env.KIND}, ${process.env.RANGE}): ${DIR}/review.diff`,
    `이미 달린 줄 댓글: ${DIR}/existing.jsonl (같은 줄 · 같은 내용이면 다시 달지 않는다)`,
    '지적은 댓글로 달지 않고 정해진 출력 형식의 칸으로만 낸다. 칸마다 설명을 지킨다.',
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
        scope: output.scope ?? '',
        checked: output.checked ?? '',
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
  const outside = new Set();
  for (const finding of result.findings) {
    const head = findingHead(finding);
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
        body: redact(formatFinding(finding)),
      });
    } else {
      // diff 밖 줄에는 GitHub 가 댓글을 받지 않는다(리뷰 전체가 거절됨) — 요약으로 옮긴다
      outside.add(`${finding.path}:${finding.line}`);
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
  writeFileSync(`${DIR}/summary.md`, redact(formatSummary(result, outside)));
  console.log(`줄 댓글 ${comments.length} · 줄 밖 ${outside.size}`);
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
