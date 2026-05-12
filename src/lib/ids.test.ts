import { describe, it, expect } from 'vitest';
import { newId, nowIso } from './ids';

describe('ids', () => {
  it('newId returns a v4 uuid', () => {
    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('newId returns unique ids', () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
  });

  it('nowIso returns an ISO 8601 timestamp', () => {
    const ts = nowIso();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});
