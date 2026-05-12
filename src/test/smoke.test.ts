import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });

  it('has fake-indexeddb available', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
