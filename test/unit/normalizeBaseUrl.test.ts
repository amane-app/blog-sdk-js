import { describe, it, expect } from 'vitest';
import { HttpClient } from '../../src/http.js';

describe('HttpClient.normalizeBaseUrl', () => {
  it('appends /api/v1/ when no version prefix is present', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });

  it('strips trailing slashes before appending the prefix', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app///')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });

  it('keeps an existing /api/v1 prefix and adds a trailing slash', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app/api/v1')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });

  it('respects future API versions like /api/v2', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app/api/v2')).toBe(
      'https://service.amane.app/api/v2/',
    );
  });

  it('handles an existing /api/v1/ with trailing slash', () => {
    expect(HttpClient.normalizeBaseUrl('https://service.amane.app/api/v1/')).toBe(
      'https://service.amane.app/api/v1/',
    );
  });
});
