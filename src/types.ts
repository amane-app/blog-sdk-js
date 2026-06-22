export interface AmaneClientConfig {
  baseUrl: string;
  token: string;
  timeout?: number;
}

export interface Article {
  id: string;
  title: string | null;
  target_keyword: string;
  status: string;
  generated_at: string | null;
  delivered_at: string | null;
  published_at: string | null;
  published_url: string | null;
  estimated_chars: number | null;
}

export interface ArticleContent extends Article {
  body_html: string;
  meta_description: string | null;
  outline: object | null;
}

export interface TopicSuggestion {
  id: string;
  topic: string;
  status: string;
  estimated_priority: string;
  proposal_reason: string | null;
}

export interface Keyword {
  id: string;
  target_keyword: string;
  status: string;
  source: string;
  priority: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export class AmaneApiError extends Error {
  statusCode: number;
  errorType: string;
  detail: string;

  constructor(
    message: string,
    statusCode: number,
    errorType: string,
    detail: string,
  ) {
    super(message);
    this.name = 'AmaneApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.detail = detail;
  }
}
