import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AmaneClient } from '../../src/index.js';
import { AmaneApiError } from '../../src/types.js';

interface RecordedRequest {
  method?: string;
  url?: string;
  authorization?: string | string[];
  body: string;
}

let server: Server;
let baseUrl: string;
const received: RecordedRequest[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      received.push({
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization,
        body,
      });

      const send = (status: number, payload: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      if (req.url?.startsWith('/api/v1/articles/missing')) {
        send(404, {
          type: 'https://err/notfound',
          title: 'Not Found',
          detail: 'article not found',
        });
        return;
      }
      if (req.url === '/api/v1/articles' && req.method === 'GET') {
        send(200, {
          data: [{ id: 'a1', title: 'Hello' }],
          meta: { total: 1, per_page: 20, current_page: 1, last_page: 1 },
        });
        return;
      }
      if (req.url === '/api/v1/articles/a1' && req.method === 'GET') {
        send(200, { id: 'a1', title: 'Hello', body_html: '<p>x</p>' });
        return;
      }
      if (req.url === '/api/v1/articles/a1/publication' && req.method === 'POST') {
        send(200, { status: 'ok' });
        return;
      }
      if (req.url === '/api/v1/usage' && req.method === 'GET') {
        send(200, { used: 10, limit: 100 });
        return;
      }
      send(404, { title: 'Not Found' });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('AmaneClient E2E (local http server)', () => {
  it('lists articles over a real http round trip with auth header', async () => {
    const client = new AmaneClient({ baseUrl, token: 'e2e-token' });

    const res = await client.articles.list();

    expect(res.data[0].id).toBe('a1');
    const last = received.at(-1)!;
    expect(last.method).toBe('GET');
    expect(last.url).toBe('/api/v1/articles');
    expect(last.authorization).toBe('Bearer e2e-token');
  });

  it('gets a single article', async () => {
    const client = new AmaneClient({ baseUrl, token: 't' });

    const article = await client.articles.get('a1');

    expect(article.id).toBe('a1');
    expect(article.body_html).toBe('<p>x</p>');
  });

  it('reports publication via a real POST with the json body', async () => {
    const client = new AmaneClient({ baseUrl, token: 't' });

    await client.articles.reportPublication('a1', 'https://blog/x', '2026-06-25');

    const last = received.at(-1)!;
    expect(last.method).toBe('POST');
    expect(JSON.parse(last.body)).toEqual({ published_url: 'https://blog/x', published_at: '2026-06-25' });
  });

  it('fetches usage', async () => {
    const client = new AmaneClient({ baseUrl, token: 't' });

    const usage = (await client.usage.get()) as { used: number; limit: number };

    expect(usage.used).toBe(10);
    expect(usage.limit).toBe(100);
  });

  it('propagates a 404 as an AmaneApiError', async () => {
    const client = new AmaneClient({ baseUrl, token: 't' });

    await expect(client.articles.get('missing')).rejects.toBeInstanceOf(AmaneApiError);
  });
});
