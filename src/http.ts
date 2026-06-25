import { AmaneApiError } from './types.js';

export class HttpClient {
  private readonly normalizedBaseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: string,
    private readonly timeout: number = 30000,
  ) {
    this.normalizedBaseUrl = HttpClient.normalizeBaseUrl(baseUrl);
  }

  /**
   * baseUrl から実際にリクエストに使う base を組み立てる。
   *
   * AMANE の SaaS API は `/api/v1/` 配下にあるので、SDK 利用者が
   *   - `https://service.amane.app`        (= プレフィックス無し)
   *   - `https://service.amane.app/api/v1` (= プレフィックス有り)
   * のどちらを渡しても動くように吸収する。`/api/v2` 等の将来の API
   * バージョンが含まれていればそのまま尊重 (= 将来互換)。
   *
   * @internal
   */
  static normalizeBaseUrl(baseUrl: string): string {
    let normalized = baseUrl.replace(/\/+$/, '');
    if (!/\/api\/v\d+$/.test(normalized)) {
      normalized += '/api/v1';
    }
    return normalized + '/';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(path.replace(/^\//, ''), this.normalizedBaseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      // non-JSON body; leave data empty
    }

    if (!response.ok) {
      const type   = (data['type']   as string | undefined) ?? 'about:blank';
      const title  = (data['title']  as string | undefined) ?? 'Error';
      const detail = (data['detail'] as string | undefined) ?? text;
      throw new AmaneApiError(title, response.status, type, detail);
    }

    return data as T;
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
