// 커밋 메시지: <type>(<scope>): <내용>
// - type 은 영어 (feat, fix, refactor, style, docs, chore, test, ci, build, perf)
// - 내용은 한글로 쓴다 — 예: "feat(web): 저장물 카드 목록 추가"
// https://www.conventionalcommits.org/

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 기본 규칙은 영어 대소문자를 검사해서 한글 내용을 막는다 — 끈다
    'subject-case': [0],
    // 기본 72자는 한글에 빡빡하다
    'header-max-length': [2, 'always', 100],
  },
};
