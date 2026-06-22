import { HttpClient } from '../http.js';
import { Keyword, PaginatedResponse } from '../types.js';

export class KeywordResource {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<PaginatedResponse<Keyword>> {
    return this.http.get<PaginatedResponse<Keyword>>('/keywords');
  }

  add(keywords: string[], priority: string = 'medium'): Promise<object> {
    return this.http.post<object>('/keywords', { keywords, priority });
  }

  remove(id: string): Promise<object> {
    return this.http.delete<object>(`/keywords/${id}`);
  }
}
