import { environmentManager, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/api-error';

const MAX_RETRIES = 2;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 서버에서 받아 넘긴 데이터를 클라이언트가 곧바로 다시 요청하지 않게 한다
        staleTime: 60 * 1000,
        // 다시 보내도 결과가 같은 실패(4xx·계약 불일치)는 재시도하지 않는다
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.isPermanent) &&
          failureCount < MAX_RETRIES,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * `cacheComponents` 를 켜 두어서 지킬 것 (Next 공식 TanStack Query 가이드):
 * - 첫 렌더에 쓰는 쿼리는 `<Suspense>` 안에 둔다 — 밖에 두면 미리 렌더링 단계에서 에러가 난다.
 * - 서버에서 미리 받아 넘길 때 `dehydrate()` 를 그대로 쓰지 않는다 — 현재 시각을 읽어 미리 렌더링 에러가 난다.
 *   Next 가이드의 대체 헬퍼를 쓴다.
 * - 서버는 미리 받기만 하고, 데이터의 주인과 그리기는 클라이언트 쿼리가 맡는다.
 */
export function getQueryClient() {
  // 서버는 요청마다 새로 만든다 — 사용자끼리 캐시가 섞이지 않게
  if (environmentManager.isServer()) return makeQueryClient();
  // 브라우저는 하나를 계속 쓴다 — 렌더 중에 다시 만들어지면 캐시를 잃는다
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
