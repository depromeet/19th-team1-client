import { z } from 'zod';

import { getClientEnv } from '@/lib/env';

import { ApiError } from './api-error';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  /** 주소 뒤 `?` 쿼리. 값이 null·undefined 인 키는 빠지고, 배열은 같은 키로 여러 번 붙는다 */
  query?: Record<string, QueryValue | QueryValue[]>;
  /** JSON 으로 보낼 본문 */
  body?: unknown;
  /** React Query 의 `signal` 을 넘기면 화면을 떠날 때 요청도 멈춘다 */
  signal?: AbortSignal;
  /** 응답을 기다릴 최대 시간(ms) */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

// 서버 성공 응답: { "data": ... } — 봉투를 벗겨 안의 값만 돌려준다
const envelopeSchema = z.object({ data: z.unknown() });

function buildUrl(path: string, query: RequestOptions['query']) {
  const url = new URL(
    path.replace(/^\//, ''),
    withTrailingSlash(getClientEnv().NEXT_PUBLIC_API_URL),
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== null && item !== undefined)
        url.searchParams.append(key, String(item));
    }
  }
  return url.toString();
}

function withTrailingSlash(base: string) {
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * 호출한 쪽의 취소와 시간 초과를 하나로 묶는다.
 * `AbortSignal.any` 는 iOS 17.4 부터라 앱 최소 지원(iOS 16.4) 웹뷰에서 없을 수 있어 직접 묶는다.
 */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('응답 시간 초과', 'TimeoutError')),
    timeoutMs,
  );
  const abortByCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortByCaller();
  signal?.addEventListener('abort', abortByCaller, { once: true });
  const cleanup = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortByCaller);
  };
  return { signal: controller.signal, cleanup };
}

// 진행 중인 똑같은 변경 요청(연타·중복 제출)은 네트워크로 한 번만 보내고 결과를 나눠 쓴다.
// 끝나면 바로 지워서, 시간상 겹친 것만 합친다. 조회(GET)는 React Query 가 이미 합친다.
const inFlight = new Map<string, Promise<RawResponse>>();

interface RawResponse {
  status: number;
  body: unknown;
}

// 실제로 같은 HTTP 요청만 같은 키가 된다: 본문 생략과 `null` 본문, 시간 제한이 다른 호출은 갈린다
function dedupeKey(method: Method, url: string, options: RequestOptions) {
  const body = options.body === undefined ? '-' : JSON.stringify(options.body);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return `${method} ${url} ${timeoutMs} ${body}`;
}

function dedupe(key: string, send: () => Promise<RawResponse>) {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = send().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** 빈 본문은 null, JSON 이 아니면 글자 그대로(그러면 스키마 검사에서 계약 불일치로 잡힌다) */
function parseBody(text: string): unknown {
  if (text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function send(
  method: Method,
  url: string,
  { body, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions,
): Promise<RawResponse> {
  const timeout = withTimeout(signal, timeoutMs);
  try {
    // 인증 방식(쿠키·헤더)이 정해지면 여기서 인증 정보를 싣고,
    // 401 이면 토큰 갱신을 한 번만(동시에 여러 401 이 와도 갱신 요청은 하나) 한 뒤 다시 보낸다
    const response = await fetch(url, {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeout.signal,
    });
    const parsedBody = parseBody(await response.text());
    if (!response.ok)
      throw ApiError.fromResponse(response.status, parsedBody, url);
    return { status: response.status, body: parsedBody };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.fromNetwork(error, url);
  } finally {
    timeout.cleanup();
  }
}

async function request<T extends z.ZodType>(
  method: Method,
  path: string,
  schema: T,
  options: RequestOptions = {},
): Promise<z.infer<T>> {
  const url = buildUrl(path, options.query);
  // 취소 신호를 따로 넘긴 호출은 수명이 달라 합치지 않는다 — 한쪽 취소가 다른 쪽까지 끊는다
  const raw =
    method === 'GET' || options.signal
      ? await send(method, url, options)
      : await dedupe(dedupeKey(method, url, options), () =>
          send(method, url, options),
        );

  // 본문 없는 성공(204 등)은 { data: null } 로 보고 스키마(z.null())로 확인한다
  const envelope = envelopeSchema.safeParse(raw.body ?? { data: null });
  if (!envelope.success)
    throw ApiError.fromValidation(envelope.error, url, raw.status);
  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success)
    throw ApiError.fromValidation(parsed.error, url, raw.status);
  return parsed.data;
}

/**
 * 서버 API 는 이것으로만 부른다. 응답 스키마를 꼭 넘긴다 — 받은 응답을 계약대로 검사하고, 타입도 거기서 나온다.
 *
 * @example
 * queryFn: ({ signal }) => api.get(`/items/${itemId}`, itemSchema, { signal })
 */
export const api = {
  get: <T extends z.ZodType>(
    path: string,
    schema: T,
    options?: RequestOptions,
  ) => request('GET', path, schema, options),
  post: <T extends z.ZodType>(
    path: string,
    schema: T,
    options?: RequestOptions,
  ) => request('POST', path, schema, options),
  put: <T extends z.ZodType>(
    path: string,
    schema: T,
    options?: RequestOptions,
  ) => request('PUT', path, schema, options),
  patch: <T extends z.ZodType>(
    path: string,
    schema: T,
    options?: RequestOptions,
  ) => request('PATCH', path, schema, options),
  delete: <T extends z.ZodType>(
    path: string,
    schema: T,
    options?: RequestOptions,
  ) => request('DELETE', path, schema, options),
};
