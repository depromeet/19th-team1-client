import { z } from 'zod';

/**
 * - `http`: 서버가 실패로 응답했다(서버의 `code` 가 있다)
 * - `network`: 응답을 못 받았다(연결 끊김·CORS 등)
 * - `timeout`: 정해진 시간 안에 응답이 없었다
 * - `aborted`: 화면을 떠나는 등으로 요청을 취소했다
 * - `validation`: 응답이 계약(스키마)과 다르다
 */
export type ApiErrorKind =
  'http' | 'network' | 'timeout' | 'aborted' | 'validation';

// 서버 실패 응답: { "code": "ITEM_NOT_FOUND", "message": "..." }
const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});

const FALLBACK_MESSAGE =
  '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
const NETWORK_MESSAGE = '서버에 연결하지 못했어요. 연결 상태를 확인해 주세요.';
const TIMEOUT_MESSAGE = '응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.';

const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

function networkKindOf(error: unknown): ApiErrorKind {
  // DOMException 은 환경에 따라 Error 를 상속하지 않아 instanceof 대신 이름으로 본다
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String(error.name)
      : '';
  if (name === 'TimeoutError') return 'timeout';
  if (name === 'AbortError') return 'aborted';
  return 'network';
}

interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  url: string;
  status: number | null;
  code: string | null;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly url: string;
  /** HTTP 상태. 응답을 못 받았으면 null */
  readonly status: number | null;
  /** 서버가 준 에러 코드(예: `ITEM_NOT_FOUND`). 서버 응답이 아니면 null */
  readonly code: string | null;

  constructor({ kind, message, url, status, code, cause }: ApiErrorInit) {
    super(message, { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.url = url;
    this.status = status;
    this.code = code;
  }

  static fromResponse(status: number, body: unknown, url: string) {
    const parsed = errorBodySchema.safeParse(body);
    return new ApiError({
      kind: 'http',
      message: parsed.success ? parsed.data.message : FALLBACK_MESSAGE,
      url,
      status,
      code: parsed.success ? parsed.data.code : null,
    });
  }

  static fromNetwork(error: unknown, url: string) {
    const kind = networkKindOf(error);
    return new ApiError({
      kind,
      message: kind === 'timeout' ? TIMEOUT_MESSAGE : NETWORK_MESSAGE,
      url,
      status: null,
      code: null,
      cause: error,
    });
  }

  static fromValidation(error: z.ZodError, url: string, status: number) {
    // 계약과 다른 응답은 재현이 어렵다 — 어느 API 의 어느 필드인지 배포 환경에서도 남긴다
    console.error(
      `[응답 계약 불일치] ${url}\n` +
        error.issues
          .map(
            (issue) =>
              `- ${issue.path.join('.') || '(전체)'}: ${issue.message}`,
          )
          .join('\n'),
    );
    return new ApiError({
      kind: 'validation',
      message: FALLBACK_MESSAGE,
      url,
      status,
      code: null,
      cause: error,
    });
  }

  /**
   * 다시 시도해도 결과가 같은 실패인가 — 요청이 잘못됐거나(4xx) 계약이 다르다.
   * 408(요청 시간 초과)·429(요청이 너무 많음)는 4xx 지만 잠시 뒤 다시 하면 되는 실패라 뺀다.
   */
  get isPermanent() {
    if (this.kind === 'validation') return true;
    if (this.kind !== 'http' || this.status === null) return false;
    return this.status < 500 && !RETRYABLE_CLIENT_STATUSES.has(this.status);
  }
}
