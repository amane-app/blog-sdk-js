import { HttpClient } from '../http.js';
import { PaginatedResponse, TopicSuggestion } from '../types.js';

export class TopicSuggestionResource {
  constructor(private readonly http: HttpClient) {}

  list(params: Record<string, unknown> = {}): Promise<PaginatedResponse<TopicSuggestion>> {
    return this.http.get<PaginatedResponse<TopicSuggestion>>('/topic-suggestions', params);
  }

  approve(id: string): Promise<object> {
    return this.http.post<object>(`/topic-suggestions/${id}/approve`);
  }

  reject(id: string, reason: string = ''): Promise<object> {
    return this.http.post<object>(`/topic-suggestions/${id}/reject`, { reason });
  }
}
