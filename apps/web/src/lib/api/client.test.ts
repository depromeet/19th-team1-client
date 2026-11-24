import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError } from './api-error';
import { api } from './client';

const itemSchema = z.object({ id: z.number(), title: z.string() });

const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
  });
}

async function captureError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('실패해야 하는데 성공했다');
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test/v1');
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('api', () => {
  it('서버 봉투 { data } 를 벗기고 스키마대로 검사한 값을 돌려준다', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, { data: { id: 1, title: '첫 글' } }),
    );

    await expect(api.get('/items/1', itemSchema)).resolves.toEqual({
      id: 1,
      title: '첫 글',
    });
  });

  it('기본 주소 뒤에 경로를 붙이고, 비어 있는 쿼리 값은 빼고 배열은 같은 키로 여러 번 붙인다', async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { data: [] }));

    await api.get('/items', z.array(itemSchema), {
      query: { page: 1, tag: ['a', 'b'], keyword: undefined },
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.test/v1/items?page=1&tag=a&tag=b',
    );
  });

  it('서버 실패 응답은 서버의 code·message 를 담은 ApiError 가 된다', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(404, { code: 'ITEM_NOT_FOUND', message: '글을 찾을 수 없어요' }),
    );

    const error = await captureError(api.get('/items/9', itemSchema));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'http',
      status: 404,
      code: 'ITEM_NOT_FOUND',
      message: '글을 찾을 수 없어요',
      isPermanent: true,
    });
  });

  it('응답이 계약과 다르면 validation 에러가 되고, 어느 필드인지 기록한다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(respond(200, { data: { id: 1 } }));

    const error = await captureError(api.get('/items/1', itemSchema));

    expect(error).toMatchObject({ kind: 'validation', status: 200 });
    expect(log.mock.calls[0]?.[0]).toContain('title');
    log.mockRestore();
  });

  it('응답을 못 받으면 network 에러가 된다', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const error = await captureError(api.get('/items/1', itemSchema));

    expect(error).toMatchObject({ kind: 'network', status: null });
  });

  it('정해진 시간 안에 응답이 없으면 timeout 에러가 된다', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const pending = captureError(
      api.get('/items/1', itemSchema, { timeoutMs: 1_000 }),
    );
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await pending).toMatchObject({ kind: 'timeout' });
  });

  it('동시에 보낸 똑같은 변경 요청은 한 번만 보내고 결과를 나눠 쓴다', async () => {
    fetchMock.mockResolvedValue(
      respond(200, { data: { id: 1, title: '새 글' } }),
    );
    const body = { title: '새 글' };

    const [first, second] = await Promise.all([
      api.post('/items', itemSchema, { body }),
      api.post('/items', itemSchema, { body }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('앞 요청이 끝난 뒤의 같은 변경 요청은 다시 보낸다', async () => {
    fetchMock.mockImplementation(async () =>
      respond(200, { data: { id: 1, title: '새 글' } }),
    );
    const body = { title: '새 글' };

    await api.post('/items', itemSchema, { body });
    await api.post('/items', itemSchema, { body });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('본문 생략과 null 본문, 시간 제한이 다른 변경 요청은 합치지 않는다', async () => {
    fetchMock.mockImplementation(async () => respond(200, { data: null }));

    await Promise.all([
      api.post('/items/1/like', z.null()),
      api.post('/items/1/like', z.null(), { body: null }),
      api.post('/items/1/like', z.null(), { timeoutMs: 1_000 }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('취소 신호를 넘긴 변경 요청은 합치지 않아, 한쪽을 취소해도 다른 쪽은 끝난다', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason),
          );
          setTimeout(() => resolve(respond(200, { data: null })), 0);
        }),
    );
    const controller = new AbortController();
    const body = { title: '새 글' };

    const cancelled = captureError(
      api.post('/items', z.null(), { body, signal: controller.signal }),
    );
    const other = api.post('/items', z.null(), { body });
    controller.abort();

    expect(await cancelled).toMatchObject({ kind: 'aborted' });
    await expect(other).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('본문 없는 성공 응답은 z.null() 스키마로 받는다', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(api.delete('/items/1', z.null())).resolves.toBeNull();
  });
});
