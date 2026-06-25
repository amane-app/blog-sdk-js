# AMANE Blog Distribution — JavaScript/TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@amane-app/blog-sdk.svg)](https://www.npmjs.com/package/@amane-app/blog-sdk)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

公式 JavaScript/TypeScript SDK for the [AMANE Blog Distribution API](https://amane.app).

AMANE が AI で自動生成した SEO 記事を、Node.js / headless CMS / Next.js プロジェクトに pull して公開できます。

## 必要要件

- Node.js 18+ (= `fetch` 標準同梱バージョン)
- npm / pnpm / yarn
- TypeScript 5+ (TS で使う場合)

## インストール

```bash
npm install @amane-app/blog-sdk
# または
pnpm add @amane-app/blog-sdk
yarn add @amane-app/blog-sdk
```

## 使い方

### クライアント初期化

```typescript
import { AmaneClient } from '@amane-app/blog-sdk';

const client = new AmaneClient({
  baseUrl: 'https://service.amane.app',          // /api/v1 は SDK が自動付与
  token: 'amb_xxxxxxxxxxxxx',                    // AMANE 管理画面で発行
  // timeout: 30000,                             // ms、省略時 30 秒
});
```

> **baseUrl について**: `https://service.amane.app` でも `https://service.amane.app/api/v1`
> でもどちらでも動きます。SDK 内部で `/api/v1/` プレフィックスを自動付与するため、
> 末尾スラッシュの有無も気にする必要はありません。

### 配信可能な記事一覧を取得

```typescript
const response = await client.articles.list();
for (const article of response.data) {
  console.log(article.title);
}
```

### 記事詳細を取得 (= 呼ぶと delivered ステータスに自動遷移)

```typescript
const article = await client.articles.get('01HF3ABC...');
console.log(article.body_html);          // HTML 本文
console.log(article.meta_description);   // メタディスクリプション
console.log(article.outline);            // アウトライン (JSON)
```

### 公開報告 (= 顧客サイトで公開した時に呼ぶ)

```typescript
await client.articles.reportPublication(
  '01HF3ABC...',
  'https://customer.example.com/blog/article-slug',
  new Date().toISOString(),                                   // publishedAt (省略可)
  'https://customer.example.com/blog/article-slug',           // canonicalUrl (省略可)
);
```

### 公開先 URL の更新 (= 公開後に URL が変わった場合)

```typescript
await client.articles.updatePublication('01HF3ABC...', {
  url: 'https://customer.example.com/new-slug',
});
```

### 非公開化 (= 取り下げ)

```typescript
await client.articles.markUnpublished('01HF3ABC...');
```

### 効果計測結果取得 (= 公開後 14 日以降)

```typescript
const perf = await client.articles.performance('01HF3ABC...');
console.log(`verdict: ${perf.data.verdict}`);
console.log(`position improvement: ${perf.data.delta.position_improvement}`);
```

### キーワード管理

```typescript
// 一覧
const keywords = await client.keywords.list();

// 追加 (Resource の create メソッド経由)
// 詳細は KeywordResource の API を参照
```

### トピック提案一覧

```typescript
const topics = await client.topics.list();
for (const topic of topics.data) {
  console.log(topic.topic, topic.estimated_priority);
}
```

### 使用量取得

```typescript
const usage = await client.usage.get();
console.log(usage);
```

## エラーハンドリング

```typescript
import { AmaneApiError } from '@amane-app/blog-sdk';

try {
  const response = await client.articles.list();
} catch (err) {
  if (err instanceof AmaneApiError) {
    if (err.statusCode === 401) {
      // トークン無効・失効 → 再発行を案内
      console.error('AMANE 認証失敗:', err.detail);
    } else if (err.statusCode === 429) {
      // レート制限超過
      console.error('AMANE レート制限超過');
    } else {
      console.error(`AMANE API エラー (${err.statusCode}): ${err.detail}`);
    }
  } else {
    throw err;  // ネットワーク or タイムアウト等
  }
}
```

## API トークンの発行

1. AMANE 管理画面 (https://service.amane.app) にログイン
2. Site 詳細 → 「📝 ブログ配信」タブ
3. 「🔑 API トークン管理」→ 新規発行 (= 表示は 1 度だけ、コピーしておく)

トークンの形式: `amb_` プレフィックス + 48 桁の hex

## .env 設定の注意点

`.env` を Windows エディタで編集すると CRLF (`\r\n`) で保存される場合があり、
`AMANE_API_TOKEN` の値に `\r` が混入して Authorization ヘッダが壊れ、サーバが 400 を返すことがあります。

**対策**:
- `.env` を保存する前にエディタの改行コードを LF に設定
- 値を SDK に渡す前に `.trim()` を入れて防御:
  ```typescript
  const client = new AmaneClient({
    baseUrl: (process.env.AMANE_API_URL ?? '').trim(),
    token: (process.env.AMANE_API_TOKEN ?? '').trim(),
  });
  ```

## 関連リンク

- [API 仕様 (OpenAPI 3.0)](https://service.amane.app/api/v1/docs)
- [PHP SDK](https://github.com/amane-app/blog-sdk-php)
- [WordPress プラグイン](https://github.com/amane-app/blog-distribution-wp)
- [プロダクトサイト](https://amane.app)

## 変更履歴

### v0.1.3 (2026-06-25)
- **fix**: `HttpClient.normalizeBaseUrl()` を追加。`baseUrl` に `/api/v1` プレフィックスが
  無くても SDK 内部で自動付与するように改善。`https://service.amane.app` を渡すと
  SaaS の SPA index.html を 200 で受けて空レスポンスになる事故を防止。後方互換あり
  (= 既に `/api/v1` を含めて渡しているコードはそのまま動く)
- **docs**: README サンプルを実在するメソッド名 (`get` / `articles.reportPublication` 等) に修正

### v0.1.2 (2026-06-23)
- 初版調整

### v0.1.0 (2026-06-22)
- 初回リリース

## ライセンス

MIT License — see [LICENSE](LICENSE)

Copyright (c) 2026 Transonic Software Corporation
