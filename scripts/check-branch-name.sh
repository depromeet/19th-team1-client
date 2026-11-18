#!/usr/bin/env sh
# 브랜치 이름 검사 — <type>/<영어-소문자-하이픈>
# 예: feat/save-card-list, fix/login-redirect, chore/initial-setup
# 사용: scripts/check-branch-name.sh [브랜치 이름]  (생략하면 현재 브랜치)

branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"

case "$branch" in
  main | dev) exit 0 ;;
esac

pattern='^(feat|fix|refactor|style|docs|chore|test|ci|build|perf)/[a-z0-9]+(-[a-z0-9]+)*$'

if printf '%s' "$branch" | grep -Eq "$pattern"; then
  exit 0
fi

echo "⛔ 브랜치 이름이 규칙과 다릅니다: $branch"
echo "   형식: <type>/<영어-소문자-하이픈>  예) feat/save-card-list"
echo "   type: feat fix refactor style docs chore test ci build perf"
echo "   바꾸기: git branch -m <새 이름>"
exit 1
