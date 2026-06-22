import { HttpClient } from '../http.js';
import { Article, ArticleContent, PaginatedResponse } from '../types.js';

export class ArticleResource {
  constructor(private readonly http: HttpClient) {}

  list(params: Record<string, unknown> = {}): Promise<PaginatedResponse<Article>> {
    return this.http.get<PaginatedResponse<Article>>('/articles', params);
  }

  get(id: string): Promise<ArticleContent> {
    return this.http.get<ArticleContent>(`/articles/${id}`);
  }

  reportPublication(
    id: string,
    url: string,
    publishedAt?: string | null,
    canonicalUrl?: string | null,
  ): Promise<object> {
    const body: Record<string, string> = { url };
    if (publishedAt != null) body['published_at'] = publishedAt;
    if (canonicalUrl != null) body['canonical_url'] = canonicalUrl;
    return this.http.post<object>(`/articles/${id}/publication`, body);
  }

  updatePublication(id: string, data: Record<string, unknown>): Promise<object> {
    return this.http.put<object>(`/articles/${id}/publication`, data);
  }

  markUnpublished(id: string): Promise<object> {
    return this.http.delete<object>(`/articles/${id}/publication`);
  }

  performance(id: string): Promise<object> {
    return this.http.get<object>(`/articles/${id}/performance`);
  }
}
