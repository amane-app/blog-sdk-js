import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AmaneClient } from '../../src/index.js';
import { AmaneApiError } from '../../src/types.js';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpClient integration (mocked fetch)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the /api/v1 URL and sends auth + json headers on GET', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], meta: {} }));
    const client = new AmaneClient({ baseUrl: 'https://service.amane.app', token: 'tkn' });

    await client.articles.list();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://service.amane.app/api/v1/articles');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tkn');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Accept).toBe('application/json');
    expect(init.body).toBeUndefined();
  });

  it('appends query params and skips null/undefined values', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], meta: {} }));
    const client = new AmaneClient({ baseUrl: 'https://service.amane.app/api/v1', token: 't' });

    await client.articles.list({ status: 'delivered', page: 2, empty: null, missing: undefined });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('status=delivered');
    expect(url).toContain('page=2');
    expect(url).not.toContain('empty');
    expect(url).not.toContain('missing');
  });

  it('serializes a POST body as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new AmaneClient({ baseUrl: 'https://x.test', token: 't' });

    await client.keywords.add(['seo'], 'high');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ keywords: ['seo'], priority: 'high' });
  });

  it('parses a JSON success body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: '1' }], meta: { total: 1 } }));
    const client = new AmaneClient({ baseUrl: 'https://x.test', token: 't' });

    const res = await client.articles.list();

    expect(res).toEqual({ data: [{ id: '1' }], meta: { total: 1 } });
  });

  it('returns an empty object when the response body is empty', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    const client = new AmaneClient({ baseUrl: 'https://x.test', token: 't' });

    const res = await client.usage.get();

    expect(res).toEqual({});
  });

  it('throws AmaneApiError built from a problem+json error body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { type: 'https://err/notfound', title: 'Not Found', detail: 'missing' },
        404,
      ),
    );
    const client = new AmaneClient({ baseUrl: 'https://x.test', token: 't' });

    await expect(client.articles.get('nope')).rejects.toMatchObject({
      name: 'AmaneApiError',
      statusCode: 404,
      errorType: 'https://err/notfound',
      message: 'Not Found',
      detail: 'missing',
    });
  });

  it('falls back to defaults when the error body lacks fields / is not JSON', async () => {
    fetchMock.mockImplementation(() => new Response('boom', { status: 500 }));
    const client = new AmaneClient({ baseUrl: 'https://x.test', token: 't' });

    await expect(client.usage.get()).rejects.toMatchObject({
      name: 'AmaneApiError',
      statusCode: 500,
      errorType: 'about:blank',
      message: 'Error',
      detail: 'boom',
    });
    await expect(client.usage.get()).rejects.toBeInstanceOf(AmaneApiError);
  });

  it('aborts the request once the timeout elapses', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const client = new AmaneClient({ baseUrl: 'https://x.test', token: 't', timeout: 5 });

    await expect(client.usage.get()).rejects.toThrow();
  });
});
