import { describe, expect, it } from 'vitest';
import { moveInOrder, sortByOrder } from './order';

type Item = { id: string; name: string };

const A: Item = { id: 'a', name: 'Alpha' };
const B: Item = { id: 'b', name: 'Bravo' };
const C: Item = { id: 'c', name: 'Charlie' };
const D: Item = { id: 'd', name: 'Delta' };

describe('sortByOrder', () => {
  it('sorts by name when order is undefined', () => {
    expect(sortByOrder([C, A, B], undefined).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by name when order is empty', () => {
    expect(sortByOrder([C, A, B], []).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('places ordered ids first in the listed order', () => {
    expect(sortByOrder([A, B, C], ['c', 'a']).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('places unordered ids after ordered ones, alphabetical', () => {
    expect(sortByOrder([A, B, C, D], ['b']).map((x) => x.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('ignores ids in order that are not present in items', () => {
    expect(sortByOrder([A, B], ['zzz', 'a']).map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('moveInOrder', () => {
  it('moves an existing id to the new index', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveInOrder(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
  });

  it('clamps negative or oversized indices', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'a', -5)).toEqual(['a', 'b', 'c']);
    expect(moveInOrder(['a', 'b', 'c'], 'a', 99)).toEqual(['b', 'c', 'a']);
  });

  it('inserts a missing id at the target index', () => {
    expect(moveInOrder(['a', 'b'], 'c', 1)).toEqual(['a', 'c', 'b']);
  });

  it('returns a new array (no mutation)', () => {
    const input = ['a', 'b', 'c'] as const;
    const out = moveInOrder(input, 'a', 2);
    expect(out).not.toBe(input);
    expect(input).toEqual(['a', 'b', 'c']);
  });
});
