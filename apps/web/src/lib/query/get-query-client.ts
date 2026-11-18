import { isServer, QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 서버에서 받아 넘긴 데이터를 클라이언트가 곧바로 다시 요청하지 않게 한다
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  // 서버는 요청마다 새로 만든다 — 사용자끼리 캐시가 섞이지 않게
  if (isServer) return makeQueryClient();
  // 브라우저는 하나를 계속 쓴다 — 렌더 중에 다시 만들어지면 캐시를 잃는다
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
