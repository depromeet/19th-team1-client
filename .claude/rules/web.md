---
paths:
  - 'apps/web/**'
---

# 웹 (apps/web)

`docs/code-standards.md` 에서 웹 몫을 뽑은 요약이다. 번호는 장부 번호. 전부 초안.

## Next 16 · cacheComponents

- API 가 학습한 Next 와 다르다. `apps/web/node_modules/next/dist/docs/` 의 해당 문서를 먼저 읽는다.
- 요청마다 달라지는 데이터(캐시하지 않은 fetch, `cookies()` · `headers()` · `searchParams`)는 `<Suspense>` 안에서 읽는다.
- 캐시할 것은 `'use cache'` 로 표시한다. 사용자별 데이터는 캐시하지 않는다. 일반 `'use cache'` 안에서 `cookies()` · `headers()` 를 직접 부르지 않는다.
- 화면을 숨겼다 다시 보여 줄 때 상태가 유지된다(Activity). 숨겨질 때 정리가 필요한 효과는 정리 함수를 둔다.

## 배치

- 기능 코드는 `src/features/<도메인>/` 안에 먼저 둔다. 두 기능 이상이 실제로 같이 쓰면 `src/lib` · `src/components` 로 올린다 (C-06).
- `page.tsx` · `layout.tsx` 는 조합만 한다. 상태·핸들러는 기능 컴포넌트로 (C-14).
- 순수 함수는 기능 폴더의 `utils.ts` 하나에 모은다. 새로 만들기 전에 있는 것을 찾는다 (C-07 · C-08).
- 경로 문자열은 상수 한 곳에서 꺼낸다 (C-11).

## 컴포넌트

- 내보내는 컴포넌트는 파일당 하나, 파일 이름과 같게. 그 파일에서만 쓰는 하위 컴포넌트는 같은 파일에 둬도 된다 (C-13).
- 새 파일은 300줄 · 핸들러 5개 · JSX 깊이 4 안에서 (C-15).
- 화면 컴포넌트 안에서 `useQuery` · `useMutation` 을 직접 만들지 않는다. 기능 폴더의 훅을 부른다 (C-16).
- 로딩·에러·빈 상태는 위에서 끊고(early return) 값이 정해진 뒤 그린다. `data?.list ?? []` 로 흘리지 않는다 (C-17).
- `useEffect` 는 외부 이벤트·타이머·서드파티·포커스/스크롤·폼 최초 값 채우기에만. props 로 state 를 맞추는 용도는 `key` 나 계산값으로 (C-18).
- 중첩 삼항 대신 변수나 `Record` 매핑 (C-19). 메모이제이션은 필요할 때만, 쓰면 이유 주석 (C-20).
- 핸들러는 `handle` + 동사(+ 명사). Next 파일 밖은 named export (C-21).
- 모달은 부모가 `useState<T | null>` 로 "대상이 있으면 열림" (C-22).

## 서버 데이터 (React Query)

- 쿼리 키는 키 함수 하나로 만들고 조회·무효화가 같이 쓴다. 무효화에서 문자열을 다시 치지 않는다 (C-23).
- 토스트·이동·무효화는 mutation 콜백(`onSuccess` · `onError`)에서. 앞이 실패하면 뒤를 보내면 안 되는 연속 요청만 `mutateAsync` + `try/catch` (C-24).
- 저장 실패는 화면에 닿는다 — 토스트·배너·`isError` 중 하나 (C-25).
- 전역 스토어를 들이지 않는다. 서버 값은 React Query, 화면 값은 `useState` · URL · Context (C-27).
- API 호출·응답 타입·폼·서버 컴포넌트 미리 받기는 팀 논의 중이다 (장부 "보류"). 정해지기 전에는 `src/lib/api` 의 `api.get(path, schema)` 와 옆 기능의 모양을 따른다.

## 스타일

- Tailwind. 조건부 클래스는 `cn()` (`@/lib/cn`) 으로 합친다 (C-30). 클래스 순서는 Prettier 가 정렬한다.
- 디자인 시스템이 생기기 전까지 임의값(`w-[13px]`)보다 Tailwind 스케일을 먼저 쓴다 (C-31).

## 테스트

- 단위 테스트는 소스 옆 `*.test.ts(x)`, E2E 만 `e2e/` (C-33).
- 새 테스트 파일 첫 주석에 "잡으려는 실패"를 한 문장으로 (C-34).
- 셀렉터는 `getByRole` · 이름이 먼저 (C-36). Playwright 는 실제 사용자 흐름만, 함수 하나로 볼 수 있는 것은 Vitest (C-37).
