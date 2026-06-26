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

  /**
   * 記事の公開を報告する。
   *
   * API は body に `published_url` (必須) / `published_at` (必須) を期待する。
   * 顧客 CMS で編集した実タイトル等があれば actualTitle / actualMetaDescription /
   * deviationNotes も送れる (= 配信ダッシュボードに実態を反映するため)。
   */
  reportPublication(
    id: string,
    url: string,
    publishedAt?: string | null,
    canonicalUrl?: string | null,
    actualTitle?: string | null,
    actualMetaDescription?: string | null,
    deviationNotes?: string | null,
  ): Promise<object> {
    const body: Record<string, string> = { published_url: url };
    if (publishedAt != null) body['published_at'] = publishedAt;
    if (canonicalUrl != null) body['canonical_url'] = canonicalUrl;
    if (actualTitle != null) body['actual_title'] = actualTitle;
    if (actualMetaDescription != null) body['actual_meta_description'] = actualMetaDescription;
    if (deviationNotes != null) body['deviation_notes'] = deviationNotes;
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
