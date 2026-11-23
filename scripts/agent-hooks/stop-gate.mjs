// Stop — 완료 관문. 이 세션에서 코드 파일을 고쳤는데 완료 검사(self-review)를 안 돌렸으면 한 번 돌려보낸다.
// - "고친 코드 파일"은 post-edit.mjs 가 수정 도구 호출에서 적은 것만 본다.
//   작업 트리 전체를 보면 다른 세션의 수정이나 git pull 로도 잘못 막는다. 셸로 쓴 파일은 놓친다(알고 둔 빈틈).
// - self-review 가 끝나면 change-tier.mjs --mark 가 파일 지문을 남긴다. 지문이 지금 내용과 같으면 검사한 것으로 본다.
// - 같은 변경에는 한 번만 막는다. 에이전트가 "검사 생략: <사유>"를 적고 다시 끝내면 통과한다.
// - 문서·설정만 바뀐 변경은 통과한다.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  fingerprint,
  readInput,
  readJson,
  repoRoot,
  respond,
  reviewMarkFile,
  sessionStateFile,
  writeJson,
} from './lib/payload.mjs';

/** 검사 뒤에 다시 바뀐(또는 한 번도 검사 안 한) 파일 */
export function unreviewed(root, pending, mark) {
  return pending.filter(
    (rel) => mark.files?.[rel] !== fingerprint(path.join(root, rel)),
  );
}

export function signature(root, files) {
  return files
    .map((rel) => `${rel}:${fingerprint(path.join(root, rel))}`)
    .sort()
    .join('|');
}

function main() {
  const input = readInput();
  // 이미 한 번 돌려보내서 이어진 턴이면 다시 막지 않는다
  if (input.stop_hook_active) return;

  const root = repoRoot(input.cwd ?? process.cwd());
  const stateFile = sessionStateFile(root, input.session_id);
  const state = readJson(stateFile, null);
  if (!state || state.pending.length === 0) return;

  const left = unreviewed(
    root,
    state.pending,
    readJson(reviewMarkFile(root), { files: {} }),
  );
  if (left.length === 0) {
    state.pending = [];
    writeJson(stateFile, state);
    return;
  }

  const sig = signature(root, left);
  if (state.blockedSignature === sig) return;
  state.blockedSignature = sig;
  writeJson(stateFile, state);

  const list = left
    .slice(0, 8)
    .map((rel) => `- ${rel}`)
    .join('\n');
  respond({
    decision: 'block',
    reason:
      `코드 파일 ${left.length}개를 고쳤는데 완료 검사를 돌리지 않았습니다.\n${list}\n\n` +
      'self-review 스킬을 돌려 결과 표를 보고에 싣고 마쳐 주세요. ' +
      '이번에는 검사할 필요가 없으면(사람이 빼라고 함, 실험용 수정 등) 답 끝에 "검사 생략: <사유>"를 적고 마치면 됩니다.',
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    // 통과
  }
}
