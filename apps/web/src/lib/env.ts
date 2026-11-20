import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;

let cached: ClientEnv | undefined;

/**
 * 환경 변수는 여기서만 읽는다 — 코드 곳곳에서 `process.env` 를 읽으면 이름 오타·빈 값이 실행 중에야 드러난다.
 * 처음 쓸 때 검사한다(모듈을 불러오는 순간 검사하면 API 를 안 쓰는 빌드·테스트까지 값이 있어야 한다).
 * `NEXT_PUBLIC_` 값은 빌드 때 코드에 박히므로 `process.env.이름` 을 그대로 적어야 한다(동적 접근 불가).
 */
export function getClientEnv(): ClientEnv {
  cached ??= clientEnvSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });
  return cached;
}
