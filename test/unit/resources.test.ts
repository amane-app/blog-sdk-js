import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HttpClient } from '../../src/http.js';
import { ArticleResource } from '../../src/resources/ArticleResource.js';
import { KeywordResource } from '../../src/resources/KeywordResource.js';
import { TopicSuggestionResource } from '../../src/resources/TopicSuggestionResource.js';

function makeHttpStub() {
  return {
    get: vi.fn().mockResolvedValue({ ok: true }),
    post: vi.fn().mockResolvedValue({ ok: true }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  };
}

describe('ArticleResource', () => {
  let http: ReturnType<typeof makeHttpStub>;
  let articles: ArticleResource;

  beforeEach(() => {
    http = makeHttpStub();
    articles = new ArticleResource(http as unknown as HttpClient);
  });

  it('list() forwards params to GET /articles', async () => {
    await articles.list({ status: 'delivered' });
    expect(http.get).toHaveBeenCalledWith('/articles', { status: 'delivered' });
  });

  it('list() defaults params to an empty object', async () => {
    await articles.list();
    expect(http.get).toHaveBeenCalledWith('/articles', {});
  });

  it('get() calls GET /articles/:id', async () => {
    await articles.get('abc');
    expect(http.get).toHaveBeenCalledWith('/articles/abc');
  });

  it('reportPublication() sends published_url when optionals are omitted', async () => {
    await articles.reportPublication('a1', 'https://ex.com/p');
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      published_url: 'https://ex.com/p',
    });
  });

  it('reportPublication() includes published_at and canonical_url when provided', async () => {
    await articles.reportPublication('a1', 'https://ex.com/p', '2026-01-01', 'https://ex.com/c');
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      published_url: 'https://ex.com/p',
      published_at: '2026-01-01',
      canonical_url: 'https://ex.com/c',
    });
  });

  it('reportPublication() includes actual_title / actual_meta_description / deviation_notes when provided', async () => {
    await articles.reportPublication(
      'a1',
      'https://ex.com/p',
      '2026-01-01',
      'https://ex.com/c',
      'CMS で直したタイトル',
      'CMS で直した meta',
      '見出しを追加',
    );
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      published_url: 'https://ex.com/p',
      published_at: '2026-01-01',
      canonical_url: 'https://ex.com/c',
      actual_title: 'CMS で直したタイトル',
      actual_meta_description: 'CMS で直した meta',
      deviation_notes: '見出しを追加',
    });
  });

  it('reportPublication() omits optionals passed as null', async () => {
    await articles.reportPublication('a1', 'https://ex.com/p', null, null);
    expect(http.post).toHaveBeenCalledWith('/articles/a1/publication', {
      published_url: 'https://ex.com/p',
    });
  });

  it('updatePublication() calls PUT with the data body', async () => {
    await articles.updatePublication('a1', { published_url: 'x' });
    expect(http.put).toHaveBeenCalledWith('/articles/a1/publication', { published_url: 'x' });
  });

  it('markUnpublished() calls DELETE', async () => {
    await articles.markUnpublished('a1');
    expect(http.delete).toHaveBeenCalledWith('/articles/a1/publication');
  });

  it('performance() calls GET /articles/:id/performance', async () => {
    await articles.performance('a1');
    expect(http.get).toHaveBeenCalledWith('/articles/a1/performance');
  });
});

describe('KeywordResource', () => {
  let http: ReturnType<typeof makeHttpStub>;
  let keywords: KeywordResource;

  beforeEach(() => {
    http = makeHttpStub();
    keywords = new KeywordResource(http as unknown as HttpClient);
  });

  it('list() calls GET /keywords', async () => {
    await keywords.list();
    expect(http.get).toHaveBeenCalledWith('/keywords');
  });

  it('add() defaults priority to medium', async () => {
    await keywords.add(['seo']);
    expect(http.post).toHaveBeenCalledWith('/keywords', { keywords: ['seo'], priority: 'medium' });
  });

  it('add() uses the provided priority', async () => {
    await keywords.add(['seo', 'sem'], 'high');
    expect(http.post).toHaveBeenCalledWith('/keywords', {
      keywords: ['seo', 'sem'],
      priority: 'high',
    });
  });

  it('remove() calls DELETE /keywords/:id', async () => {
    await keywords.remove('k1');
    expect(http.delete).toHaveBeenCalledWith('/keywords/k1');
  });
});

describe('TopicSuggestionResource', () => {
  let http: ReturnType<typeof makeHttpStub>;
  let topics: TopicSuggestionResource;

  beforeEach(() => {
    http = makeHttpStub();
    topics = new TopicSuggestionResource(http as unknown as HttpClient);
  });

  it('list() forwards params to GET /topic-suggestions', async () => {
    await topics.list({ status: 'pending' });
    expect(http.get).toHaveBeenCalledWith('/topic-suggestions', { status: 'pending' });
  });

  it('list() defaults params to an empty object', async () => {
    await topics.list();
    expect(http.get).toHaveBeenCalledWith('/topic-suggestions', {});
  });

  it('approve() calls POST /topic-suggestions/:id/approve with no body', async () => {
    await topics.approve('t1');
    expect(http.post).toHaveBeenCalledWith('/topic-suggestions/t1/approve');
  });

  it('reject() defaults reason to an empty string', async () => {
    await topics.reject('t1');
    expect(http.post).toHaveBeenCalledWith('/topic-suggestions/t1/reject', { reason: '' });
  });

  it('reject() forwards a provided reason', async () => {
    await topics.reject('t1', 'off-topic');
    expect(http.post).toHaveBeenCalledWith('/topic-suggestions/t1/reject', { reason: 'off-topic' });
  });
});
