import { describe, it, expect } from 'vitest';
import { AmaneApiError } from '../../src/types.js';

describe('AmaneApiError', () => {
  it('sets all fields, name, and is an Error', () => {
    const err = new AmaneApiError('Not Found', 404, 'about:blank', 'no such article');

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.errorType).toBe('about:blank');
    expect(err.detail).toBe('no such article');
    expect(err.name).toBe('AmaneApiError');
  });
});
