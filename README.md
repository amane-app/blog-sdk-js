# AMANE Blog Distribution — JavaScript/TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@amane/blog-sdk.svg)](https://www.npmjs.com/package/@amane/blog-sdk)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

公式 JavaScript/TypeScript SDK for the [AMANE Blog Distribution API](https://amane.app).

AMANE が AI で自動生成した SEO 記事を、Node.js / headless CMS / Next.js プロジェクトに pull して公開できます。

## 必要要件

- Node.js 18+
- npm / pnpm / yarn

## インストール

```bash
npm install @amane/blog-sdk
# または
pnpm add @amane/blog-sdk
yarn add @amane/blog-sdk
```

## 使い方

### クライアント初期化

```typescript
import { AmaneClient } from '@amane/blog-sdk';

const client = new AmaneClient({
  apiUrl: 'https://service.amane.app',
  apiToken: 'amb_xxxxxxxxxxxxx',  // AMANE 管理画面で発行
});
```

### 配信可能な記事一覧を取得

```typescript
const articles = await client.articles.list();
for (const article of articles.data) {
  console.log(article.title);
}
```

### 記事詳細を取得 (= delivered ステータスに遷移)

```typescript
const article = await client.articles.fetch('art_01HF3ABC...');
console.log(article.content_html);      // HTML 本文
console.log(article.content_markdown);  // Markdown 本文
```

### 公開報告 (= 顧客サイトで公開した時に呼ぶ)

```typescript
await client.publication.report({
  articleId: 'art_01HF3ABC...',
  publishedUrl: 'https://customer.example.com/blog/article-slug',
  publishedAt: new Date(),
});
```

### 効果計測結果取得 (= 公開後 14 日以降)

```typescript
const perf = await client.performance.get('art_01HF3ABC...');
console.log(`verdict: ${perf.data.verdict}`);
console.log(`position improvement: ${perf.data.delta.position_improvement}`);
```

## API トークンの発行

1. AMANE 管理画面 (https://service.amane.app) にログイン
2. Site 詳細 → 「📝 ブログ配信」タブ
3. API トークン発行 (= 表示は 1 度だけ、コピーしておく)

トークンの形式: `amb_` プレフィックス + 48 桁の hex

## 関連リンク

- [API 仕様 (OpenAPI 3.0)](https://service.amane.app/api/v1/docs)
- [PHP SDK](https://github.com/amane-app/blog-sdk-php)
- [WordPress プラグイン](https://github.com/amane-app/blog-distribution-wp)
- [プロダクトサイト](https://amane.app)

## ライセンス

MIT License — see [LICENSE](LICENSE)

Copyright (c) 2026 Transonic Software Corporation
