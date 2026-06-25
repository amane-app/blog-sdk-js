# テスト基盤 + GitHub Actions CI 設計

- **日付**: 2026-06-25
- **対象**: `@amane-app/blog-sdk` (blog-sdk-js)
- **目的**: 単体 / 結合 / E2E の3層テストを整備し、カバレッジ90%以上をゲート化したうえで GitHub Actions で自動実行する。

## 背景 / 現状

- 小規模な TypeScript SDK。`src/` 構成:
  - `http.ts` … `HttpClient`（fetch ラッパ、`normalizeBaseUrl`、`request`、エラー変換）
  - `index.ts` … `AmaneClient`（lazy getter）+ `UsageResource`
  - `resources/ArticleResource.ts` / `KeywordResource.ts` / `TopicSuggestionResource.ts`
  - `types.ts` … 型定義 + `AmaneApiError`
- `package.json` の `scripts.test` は `node --test` 指定のみで、テストファイルは未作成。
- `.github/` は未作成。
- `tsconfig.json` は `module: NodeNext` / `target: ES2022` / `strict: true`。ソースは `.js` 拡張子付き相対 import。

## 方針決定（確定済み）

- **テストフレームワーク**: Vitest（TypeScript 対応・v8 カバレッジ・モックが標準装備）
- **E2E 方式**: ローカルモック HTTP サーバ（Node 標準 `http`）。実 API・秘匿情報に依存しない。

## アーキテクチャ / テスト3層

SDK の構造「Resource 層 → HttpClient → fetch → API」を層ごとに切り分ける。

### 単体 (unit) — `test/unit/`
- HttpClient をスタブ注入、ネットワークには一切触れない。
- 検証対象:
  - `HttpClient.normalizeBaseUrl`（純粋関数）: プレフィックス無し / 有り / 末尾スラッシュ / `/api/v2` などのバリエーション。
  - 各 Resource: スタブ HttpClient を渡し、呼ばれるメソッド・パス・body 引数の組み立てを検証（`reportPublication` の任意引数の有無、`keywords.add` の既定 priority、`topics.reject` の既定 reason など分岐を網羅）。
  - `AmaneClient`: 各 getter が正しい Resource 型を返し、二度目以降は同一インスタンス（メモ化）であること。`UsageResource.get` のパス。
  - `AmaneApiError`: コンストラクタが `message/statusCode/errorType/detail/name` を正しく設定。

### 結合 (integration) — `test/integration/`
- Resource → 実 `HttpClient` → **モックした `fetch`**（`globalThis.fetch` を `vi.fn` で差し替え）。
- 検証対象:
  - URL 組み立て（`normalizedBaseUrl` + path + クエリ）。
  - 認証ヘッダ `Authorization: Bearer <token>`、`Content-Type`/`Accept`。
  - リクエスト body の JSON シリアライズ、GET 時に body 無し。
  - クエリ付与時の `undefined`/`null` スキップ。
  - 2xx レスポンスの JSON parse、空ボディ時に `{}`。
  - 非 2xx → `AmaneApiError`（`type/title/detail` の取り出し、欠落時のフォールバック）。
  - 非 JSON ボディのハンドリング。
  - タイムアウト（`AbortController` で abort される経路）。

### E2E — `test/e2e/`
- `AmaneClient` → 実 HttpClient → **実 fetch** → ローカル `http.Server`（localhost、ポート0で動的割当）。
- 本物のネットワーク往復で代表フローを通し検証:
  - `articles.list` / `articles.get` / `articles.reportPublication`
  - `usage.get`
  - 404 応答が `AmaneApiError` として伝播すること
  - サーバ側で受信したヘッダ・メソッド・ボディを表明

## ツール構成

- 依存追加（devDependencies）: `vitest`, `@vitest/coverage-v8`
- ディレクトリ: `test/unit/`, `test/integration/`, `test/e2e/`
- `vitest.config.ts`:
  - `test.environment = 'node'`
  - カバレッジ provider `v8`、対象 `src/**`、閾値 **lines / functions / statements / branches すべて 90%**（下回ると非0終了で CI 失敗）
- `package.json` scripts:
  - `test` … 全テスト実行（`vitest run`）
  - `test:unit` … `vitest run test/unit`
  - `test:integration` … `vitest run test/integration`
  - `test:e2e` … `vitest run test/e2e`
  - `test:coverage` … `vitest run --coverage`
  - `typecheck` … `tsc --noEmit`
  - 既存 `build` (`tsc`) は維持

## GitHub Actions — `.github/workflows/ci.yml`

- **トリガー**: `push`（`main`）と `pull_request`
- **Node マトリクス**: 20.x / 22.x（標準 `fetch`/`AbortController` 対応のため 18 未満は対象外）
- **ステップ**:
  1. `actions/checkout`
  2. `actions/setup-node`（`cache: npm`）
  3. `npm ci`
  4. `npm run typecheck`（`tsc --noEmit`）
  5. `npm run build`（`tsc`）
  6. `npm run test:unit`
  7. `npm run test:integration`
  8. `npm run test:e2e`
  9. `npm run test:coverage`（90% 閾値ゲート）
- カバレッジ summary をジョブログに出力（text reporter）。

## スコープ外 / 補足

- リンタ（ESLint 等）は現状未導入のため今回は対象外。`typecheck` のみ導入。
- E2E は外部秘匿情報・実 API に依存しない（localhost モックサーバ）ため、フォーク PR でも安定動作する。
- 既存 `"test": "node --test"` は Vitest 版に置き換える。

## 成功基準

- `npm run test:unit` / `test:integration` / `test:e2e` がいずれもグリーン。
- `npm run test:coverage` が 4 指標すべて 90% 以上で成功。
- CI が push / PR で自動実行され、Node 20・22 両方でグリーン。
