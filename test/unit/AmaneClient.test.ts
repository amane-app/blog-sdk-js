import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '../../src/http.js';
import {
  AmaneClient,
  UsageResource,
  ArticleResource,
  TopicSuggestionResource,
  KeywordResource,
} from '../../src/index.js';

describe('AmaneClient', () => {
  function makeClient() {
    return new AmaneClient({ baseUrl: 'https://service.amane.app', token: 'tkn' });
  }

  it('exposes the article resource and memoizes it', () => {
    const client = makeClient();
    expect(client.articles).toBeInstanceOf(ArticleResource);
    expect(client.articles).toBe(client.articles);
  });

  it('exposes the topics resource and memoizes it', () => {
    const client = makeClient();
    expect(client.topics).toBeInstanceOf(TopicSuggestionResource);
    expect(client.topics).toBe(client.topics);
  });

  it('exposes the keywords resource and memoizes it', () => {
    const client = makeClient();
    expect(client.keywords).toBeInstanceOf(KeywordResource);
    expect(client.keywords).toBe(client.keywords);
  });

  it('exposes the usage resource and memoizes it', () => {
    const client = makeClient();
    expect(client.usage).toBeInstanceOf(UsageResource);
    expect(client.usage).toBe(client.usage);
  });
});

describe('UsageResource', () => {
  it('get() calls GET /usage', async () => {
    const http = { get: vi.fn().mockResolvedValue({ used: 1 }) };
    const usage = new UsageResource(http as unknown as HttpClient);
    await usage.get();
    expect(http.get).toHaveBeenCalledWith('/usage');
  });
});
