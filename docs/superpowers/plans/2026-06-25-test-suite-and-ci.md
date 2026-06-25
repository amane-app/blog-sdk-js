# テスト基盤 + GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitest による単体/結合/E2E の3層テストを整備し、カバレッジ90%以上をゲート化したうえで GitHub Actions で自動実行する。

**Architecture:** 既存の `@amane-app/blog-sdk` は「Resource層 → HttpClient → fetch → API」という構造。テストを層ごとに分離する。単体=HttpClientをスタブ注入してネットワークに触れない、結合=実HttpClient+`globalThis.fetch`モック、E2E=`AmaneClient`から実fetchでローカル`http.Server`へ通信。カバレッジは Vitest v8 provider で4指標90%閾値を設定。

**Tech Stack:** TypeScript (NodeNext, ES2022), Vitest, @vitest/coverage-v8, Node 標準 `http`, GitHub Actions。

## Global Constraints

- パッケージ名: `@amane-app/blog-sdk`（変更しない）。
- 既存ソース `src/**` は **変更しない**（テストで挙動を検証する。もしテストが赤くなったら実バグの可能性 → 停止して報告）。
- ソースは `module: NodeNext`・相対 import に `.js` 拡張子付き。Vitest がこれを解決する。
- テストは TypeScript で記述し `test/{unit,integration,e2e}/**/*.test.ts` に置く。
- `tsconfig.json` の `include` は `["src/**/*"]` のまま（テストは `tsc` の対象外。型チェックは Vitest 実行時に行われる）。
- カバレッジ閾値: lines / functions / statements / branches すべて **90%**。
- Node 対象: 20.x / 22.x。
- 既存 `package.json` の `build`（`tsc`）と `prepublishOnly` は維持。
- リンタは導入しない（スコープ外）。

---

## File Structure

- Create: `vitest.config.ts` — Vitest 設定（include / coverage / thresholds）
- Modify: `package.json` — devDependencies と scripts 追加
- Create: `package-lock.json` — `npm install` で生成（CI の `npm ci` が要求）
- Modify/Create: `.gitignore` — `coverage/` を無視
- Create: `test/unit/AmaneApiError.test.ts`
- Create: `test/unit/normalizeBaseUrl.test.ts`
- Create: `test/unit/resources.test.ts`
- Create: `test/unit/AmaneClient.test.ts`
- Create: `test/integration/httpClient.test.ts`
- Create: `test/e2e/client.e2e.test.ts`
- Create: `.github/workflows/ci.yml`

---

## Task 1: ツール基盤セットアップ + 最初の単体テスト

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`（無ければ作成、有れば追記）
- Create: `package-lock.json`（`npm install` が生成）
- Test: `test/unit/AmaneApiError.test.ts`

**Interfaces:**
- Consumes: 既存 `src/types.ts` の `AmaneApiError`（`new AmaneApiError(message, statusCode, errorType, detail)` / フィールド `message, statusCode, errorType, detail, name`）。
- Produces: `npm run test:unit` / `test:integration` / `test:e2e` / `test:coverage` / `typecheck` スクリプト。`vitest.config.ts`（他タスク共通）。

- [ ] **Step 1: Vitest を devDependency に追加**

Run:
```bash
npm install -D vitest @vitest/coverage-v8
```
Expected: `node_modules` に vitest が入り、`package.json` の devDependencies に追記され、`package-lock.json` が生成される。

- [ ] **Step 2: `package.json` の scripts を更新**

`scripts` を以下に置き換える（`build` と `prepublishOnly` は残す）:
```json
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run test/unit",
    "test:integration": "vitest run test/integration",
    "test:e2e": "vitest run test/e2e",
    "test:coverage": "vitest run --coverage"
  },
```

- [ ] **Step 3: `vitest.config.ts` を作成**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
});
```

- [ ] **Step 4: `.gitignore` に `coverage/` を追加**

`.gitignore` が無ければ作成、あれば末尾に追記:
```
node_modules/
dist/
coverage/
```

- [ ] **Step 5: 最初の単体テストを書く（`test/unit/AmaneApiError.test.ts`）**

```ts
import { describe, it, expect } from 'vitest';
import { AmaneApiError } from '../../src/types.js';

describe('AmaneApiError', () => {
  it('sets all fields, name, and is an Error', () => {
    const err = new AmaneApiError('Not Found', 404, 'about:blank', 'no such article');

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.errorType).toBe('about:blank');
    expect(err.detail).toBe('no such article');
    expect(err.name).toBe('AmaneApiError');
  });
});
```

- [ ] **Step 6: テストを実行してグリーンを確認**

Run:
```bash
npm run test:unit
```
Expected: PASS（1 test passed）。既存コードを検証しているので最初から緑になるはず。もし赤なら実装側のバグ → 停止して報告。

- [ ] **Step 7: コミット**

```bash
git add package.json package-lock.json vitest.config.ts .gitignore test/unit/AmaneApiError.test.ts
git commit -m "test: Vitest 基盤と AmaneApiError 単体テストを追加"
```

---

## Task 2: 単体テスト — normalizeBaseUrl

**Files:**
- Test: `test/unit/normalizeBaseUrl.test.ts`

**Interfaces:**
- Consumes: `src/http.ts` の `static HttpClient.normalizeBaseUrl(baseUrl: string): string`。

- [ ] **Step 1: テストを書く**

`test/unit/normalizeBaseUrl.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { HttpClient } from '../../src/http.js';

describe('HttpClient.normalizeBaseUrl', () => {
  it('appends /api/v1/ when no version prefix is present', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });

  it('strips trailing slashes before appending the prefix', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app///')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });

  it('keeps an existing /api/v1 prefix and adds a trailing slash', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app/api/v1')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });

  it('respects future API versions like /api/v2', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app/api/v2')).toBe(
      'https://service.amane.app/api/v2/',
    );
  });

  it('handles an existing /api/v1/ with trailing slash', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app/api/v1/')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });
});
```

- [ ] **Step 2: 実行してグリーン確認**

Run:
```bash
npm run test:unit
```
Expected: PASS（normalizeBaseUrl の 5 ケース含め全て緑）。

- [ ] **Step 3: コミット**

```bash
git add test/unit/normalizeBaseUrl.test.ts
git commit -m "test: normalizeBaseUrl の単体テストを追加"
```

---

## Task 3: 単体テスト — 各 Resource（スタブ HttpClient）

**Files:**
- Test: `test/unit/resources.test.ts`

**Interfaces:**
- Consumes:
  - `ArticleResource(http)`: `list(params?)→GET /articles`, `get(id)→GET /articles/:id`, `reportPublication(id,url,publishedAt?,canonicalUrl?)→POST /articles/:id/publication`, `updatePublication(id,data)→PUT`, `markUnpublished(id)→DELETE`, `performance(id)→GET /articles/:id/performance`
  - `KeywordResource(http)`: `list()→GET /keywords`, `add(keywords,priority='medium')→POST /keywords`, `remove(id)→DELETE /keywords/:id`
  - `TopicSuggestionResource(http)`: `list(params?)→GET /topic-suggestions`, `approve(id)→POST /topic-suggestions/:id/approve`, `reject(id,reason='')→POST /topic-suggestions/:id/reject`
- HttpClient は `get/post/put/delete` を持つので `vi.fn()` のスタブを `as unknown as HttpClient` で注入する。

- [ ] **Step 1: テストを書く**

`test/unit/resources.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HttpClient } from '../../src/http.js';
import { ArticleResource } from '../../src/resources/ArticleResource.js';
import { KeywordResource } from '../../src/resources/KeywordResource.js';
import { TopicSuggestionResource } from '../../src/resources/TopicSuggestionResource.js';

function makeHttpStub() {
  return {
    get: vi.fn().mockResolvedValue({ ok: true }),
    post: vi.fn().mockResolvedValue({ ok: true }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  };
}

describe('ArticleResource', () => {
  let http: ReturnType<typeof makeHttpStub>;
  let articles: ArticleResource;

  beforeEach(() => {
    http = makeHttpStub();
    articles = new ArticleResource(http as unknown as HttpClient);
  });

  it('list() forwards params to GET /articles', async () => {
    await articles.list({ status: 'delivered' });
    expect(http.get).toHaveBeenCalledWith('/articles', { status: 'delivered' });
  });

  it('list() defaults params to an empty object', async () => {
    await articles.list();
    expect(http.get).toHaveBeenCalledWith('/articles', {});
  });

  it('get() calls GET /articles/:id', async () => {
    await articles.get('abc');
    expect(http.get).toHaveBeenCalledWith('/articles/abc');
  });

  it('reportPublication() sends only url when optionals are omitted', async () => {
    await articles.reportPublication('a1', 'https://ex.com/p');
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      url: 'https://ex.com/p',
    });
  });

  it('reportPublication() includes published_at and canonical_url when provided', async () => {
    await articles.reportPublication('a1', 'https://ex.com/p', '2026-01-01', 'https://ex.com/c');
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      url: 'https://ex.com/p',
      published_at: '2026-01-01',
      canonical_url: 'https://ex.com/c',
    });
  });

  it('reportPublication() omits optionals passed as null', async () => {
    await articles.reportPublication('a1', 'https://ex.com/p', null, null);
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      url: 'https://ex.com/p',
    });
  });

  it('updatePublication() calls PUT with the data body', async () => {
    await articles.updatePublication('a1', { published_url: 'x' });
    expect(http.put).toHaveBeenCalledWith('/articles/a1/publication', { published_url: 'x' });
  });

  it('markUnpublished() calls DELETE', async () => {
    await articles.markUnpublished('a1');
    expect(http.delete).toHaveBeenCalledWith('/articles/a1/publication');
  });

  it('performance() calls GET /articles/:id/performance', async () => {
    await articles.performance('a1');
    expect(http.get).toHaveBeenCalledWith('/articles/a1/performance');
  });
});

describe('KeywordResource', () => {
  let http: ReturnType<typeof makeHttpStub>;
  let keywords: KeywordResource;

  beforeEach(() => {
    http = makeHttpStub();
    keywords = new KeywordResource(http as unknown as HttpClient);
  });

  it('list() calls GET /keywords', async () => {
    await keywords.list();
    expect(http.get).toHaveBeenCalledWith('/keywords');
  });

  it('add() defaults priority to medium', async () => {
    await keywords.add(['seo']);
    expect(http.post).toHaveBeenCalledWith('/keywords', { keywords: ['seo'], priority: 'medium' });
  });

  it('add() uses the provided priority', async () => {
    await keywords.add(['seo', 'sem'], 'high');
    expect(http.post).toHaveBeenCalledWith('/keywords', {
      keywords: ['seo', 'sem'],
      priority: 'high',
    });
  });

  it('remove() calls DELETE /keywords/:id', async () => {
    await keywords.remove('k1');
    expect(http.delete).toHaveBeenCalledWith('/keywords/k1');
  });
});

describe('TopicSuggestionResource', () => {
  let http: ReturnType<typeof makeHttpStub>;
  let topics: TopicSuggestionResource;

  beforeEach(() => {
    http = makeHttpStub();
    topics = new TopicSuggestionResource(http as unknown as HttpClient);
  });

  it('list() forwards params to GET /topic-suggestions', async () => {
    await topics.list({ status: 'pending' });
    expect(http.get).toHaveBeenCalledWith('/topic-suggestions', { status: 'pending' });
  });

  it('list() defaults params to an empty object', async () => {
    await topics.list();
    expect(http.get).toHaveBeenCalledWith('/topic-suggestions', {});
  });

  it('approve() calls POST /topic-suggestions/:id/approve with no body', async () => {
    await topics.approve('t1');
    expect(http.post).toHaveBeenCalledWith('/topic-suggestions/t1/approve');
  });

  it('reject() defaults reason to an empty string', async () => {
    await topics.reject('t1');
    expect(http.post).toHaveBeenCalledWith('/topic-suggestions/t1/reject', { reason: '' });
  });

  it('reject() forwards a provided reason', async () => {
    await topics.reject('t1', 'off-topic');
    expect(http.post).toHaveBeenCalledWith('/topic-suggestions/t1/reject', { reason: 'off-topic' });
  });
});
```

- [ ] **Step 2: 実行してグリーン確認**

Run:
```bash
npm run test:unit
```
Expected: PASS（全 Resource ケース緑）。

- [ ] **Step 3: コミット**

```bash
git add test/unit/resources.test.ts
git commit -m "test: 各 Resource の単体テストを追加"
```

---

## Task 4: 単体テスト — AmaneClient と UsageResource

**Files:**
- Test: `test/unit/AmaneClient.test.ts`

**Interfaces:**
- Consumes: `src/index.ts` の `AmaneClient`（getter `articles/topics/keywords/usage`、コンストラクタ `new AmaneClient({ baseUrl, token, timeout? })`）と `UsageResource`（`get()→GET /usage`）。getter は `??=` でメモ化される。

- [ ] **Step 1: テストを書く**

`test/unit/AmaneClient.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '../../src/http.js';
import {
  AmaneClient,
  UsageResource,
  ArticleResource,
  TopicSuggestionResource,
  KeywordResource,
} from '../../src/index.js';

describe('AmaneClient', () => {
  function makeClient() {
    return new AmaneClient({ baseUrl: 'https://service.amane.app', token: 'tkn' });
  }

  it('exposes the article resource and memoizes it', () => {
    const client = makeClient();
    expect(client.articles).toBeInstanceOf(ArticleResource);
    expect(client.articles).toBe(client.articles);
  });

  it('exposes the topics resource and memoizes it', () => {
    const client = makeClient();
    expect(client.topics).toBeInstanceOf(TopicSuggestionResource);
    expect(client.topics).toBe(client.topics);
  });

  it('exposes the keywords resource and memoizes it', () => {
    const client = makeClient();
    expect(client.keywords).toBeInstanceOf(KeywordResource);
    expect(client.keywords).toBe(client.keywords);
  });

  it('exposes the usage resource and memoizes it', () => {
    const client = makeClient();
    expect(client.usage).toBeInstanceOf(UsageResource);
    expect(client.usage).toBe(client.usage);
  });
});

describe('UsageResource', () => {
  it('get() calls GET /usage', async () => {
    const http = { get: vi.fn().mockResolvedValue({ used: 1 }) };
    const usage = new UsageResource(http as unknown as HttpClient);
    await usage.get();
    expect(http.get).toHaveBeenCalledWith('/usage');
  });
});
```

- [ ] **Step 2: 実行してグリーン確認**

Run:
```bash
npm run test:unit
```
Expected: PASS。

- [ ] **Step 3: コミット**

```bash
git add test/unit/AmaneClient.test.ts
git commit -m "test: AmaneClient の getter メモ化と UsageResource の単体テストを追加"
```

---

## Task 5: 結合テスト — HttpClient（fetch をモック）

**Files:**
- Test: `test/integration/httpClient.test.ts`

**Interfaces:**
- Consumes: `AmaneClient`（from `src/index.ts`）と `AmaneApiError`（from `src/types.ts`）。HttpClient はリクエストヘッダをプレーンオブジェクトで構築するため `init.headers.Authorization` 等で参照できる。`globalThis.fetch` を `vi.stubGlobal` で差し替える。

- [ ] **Step 1: テストを書く**

`test/integration/httpClient.test.ts`:
```ts
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
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
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
```

- [ ] **Step 2: 実行してグリーン確認**

Run:
```bash
npm run test:integration
```
Expected: PASS（8 ケース緑）。

- [ ] **Step 3: コミット**

```bash
git add test/integration/httpClient.test.ts
git commit -m "test: HttpClient の結合テスト（fetchモック）を追加"
```

---

## Task 6: E2E テスト — ローカル http サーバ

**Files:**
- Test: `test/e2e/client.e2e.test.ts`

**Interfaces:**
- Consumes: `AmaneClient`（from `src/index.ts`）, `AmaneApiError`（from `src/types.ts`）, Node `node:http` の `createServer`, `node:net` の `AddressInfo`。`baseUrl` には `/api/v1` を含めない `http://127.0.0.1:<port>` を渡し、`normalizeBaseUrl` が `/api/v1/` を補う前提でサーバのルートを `/api/v1/...` にする。

- [ ] **Step 1: テストを書く**

`test/e2e/client.e2e.test.ts`:
```ts
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
    expect(JSON.parse(last.body)).toEqual({ url: 'https://blog/x', published_at: '2026-06-25' });
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
```

- [ ] **Step 2: 実行してグリーン確認**

Run:
```bash
npm run test:e2e
```
Expected: PASS（5 ケース緑）。

- [ ] **Step 3: コミット**

```bash
git add test/e2e/client.e2e.test.ts
git commit -m "test: ローカル http サーバを使った E2E テストを追加"
```

---

## Task 7: カバレッジゲート確認 + GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: package.json scripts（`typecheck`, `build`, `test:unit`, `test:integration`, `test:e2e`, `test:coverage`）, `package-lock.json`（`npm ci`）。

- [ ] **Step 1: 全テスト + カバレッジを実行して 90% 閾値を満たすことを確認**

Run:
```bash
npm run test:coverage
```
Expected: 全テスト PASS、かつ coverage summary で lines/functions/statements/branches すべて 90% 以上。閾値未達なら Vitest が非0で終了する。
未達の場合は不足している分岐（例: HttpClient の `query` 無し経路など）を補うテストを該当の `test/` ファイルに追加してから次へ進む。

- [ ] **Step 2: 型チェックが通ることを確認**

Run:
```bash
npm run typecheck
```
Expected: エラーなく終了（`src/**` の型チェック）。

- [ ] **Step 3: CI ワークフローを作成**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: [20.x, 22.x]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: E2E tests
        run: npm run test:e2e

      - name: Coverage (90% gate)
        run: npm run test:coverage
```

- [ ] **Step 4: ワークフローの YAML 妥当性をローカルで確認**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/ci.yml','utf8');if(!s.includes('test:coverage'))throw new Error('coverage step missing');console.log('workflow looks ok');"
```
Expected: `workflow looks ok` と表示。

- [ ] **Step 5: コミット**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions で typecheck/build/単体・結合・E2E・カバレッジを実行"
```

- [ ] **Step 6: （任意）リモートへ push して CI を起動**

ユーザーに push 可否を確認してから:
```bash
git push origin main
```
Expected: GitHub Actions の CI ワークフローが Node 20/22 で起動し、全ジョブがグリーン。

---

## Self-Review

- **Spec coverage:**
  - 単体テスト → Task 1〜4（AmaneApiError / normalizeBaseUrl / Resources / AmaneClient+Usage）✅
  - 結合テスト → Task 5（fetchモックで URL/ヘッダ/body/parse/エラー変換/タイムアウト）✅
  - E2E → Task 6（ローカル http サーバで代表フロー + 404 伝播）✅
  - カバレッジ90%ゲート → vitest.config.ts thresholds（Task 1）+ Task 7 Step 1 で検証 ✅
  - GitHub Actions（push/PR, Node 20/22, typecheck→build→各テスト→coverage）→ Task 7 ✅
  - Vitest + @vitest/coverage-v8 採用、E2E はローカルモックサーバ → Task 1 / Task 6 ✅
- **Placeholder scan:** プレースホルダ無し。各ステップに完全なコード/コマンドあり。
- **Type consistency:** スタブの形 `{get,post,put,delete: vi.fn()}` を Task 3〜4 で統一。`AmaneClient({baseUrl, token, timeout?})`・各 getter 名・`UsageResource.get→/usage`・`normalizeBaseUrl` の戻り値（末尾 `/api/vN/`）を全タスクで一致させた。E2E のサーバルートは `normalizeBaseUrl` が付与する `/api/v1/` 前提で記述。
```
