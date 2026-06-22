import { HttpClient } from './http.js';
import { ArticleResource } from './resources/ArticleResource.js';
import { TopicSuggestionResource } from './resources/TopicSuggestionResource.js';
import { KeywordResource } from './resources/KeywordResource.js';
import { AmaneClientConfig } from './types.js';

export class UsageResource {
  constructor(private readonly http: HttpClient) {}

  get(): Promise<object> {
    return this.http.get<object>('/usage');
  }
}

export class AmaneClient {
  private readonly http: HttpClient;

  private _articles?: ArticleResource;
  private _topics?: TopicSuggestionResource;
  private _keywords?: KeywordResource;
  private _usage?: UsageResource;

  constructor(config: AmaneClientConfig) {
    this.http = new HttpClient(config.baseUrl, config.token, config.timeout);
  }

  get articles(): ArticleResource {
    return (this._articles ??= new ArticleResource(this.http));
  }

  get topics(): TopicSuggestionResource {
    return (this._topics ??= new TopicSuggestionResource(this.http));
  }

  get keywords(): KeywordResource {
    return (this._keywords ??= new KeywordResource(this.http));
  }

  get usage(): UsageResource {
    return (this._usage ??= new UsageResource(this.http));
  }
}

export default AmaneClient;

export { ArticleResource } from './resources/ArticleResource.js';
export { TopicSuggestionResource } from './resources/TopicSuggestionResource.js';
export { KeywordResource } from './resources/KeywordResource.js';
export {
  AmaneApiError,
  type AmaneClientConfig,
  type Article,
  type ArticleContent,
  type TopicSuggestion,
  type Keyword,
  type PaginatedResponse,
} from './types.js';
