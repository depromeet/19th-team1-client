'use client';

import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { getQueryClient } from '@/lib/query/get-query-client';

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 중에만 화면 구석에 뜬다 — 배포 빌드에서는 그려지지 않는다 */}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
