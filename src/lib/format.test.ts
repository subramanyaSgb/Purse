import { describe, it, expect } from 'vitest';
import { fmtINR, fmtINRSigned } from './format';

describe('fmtINR', () => {
  it('renders small positive amounts with the rupee glyph and no commas', () => {
    expect(fmtINR(0)).toBe('₹0');
    expect(fmtINR(42)).toBe('₹42');
    expect(fmtINR(999)).toBe('₹999');
  });

  it('groups four-digit amounts as 1,234', () => {
    expect(fmtINR(1000)).toBe('₹1,000');
    expect(fmtINR(1234)).toBe('₹1,234');
  });

  it('uses Indian comma grouping for lakhs and crores', () => {
    expect(fmtINR(12345)).toBe('₹12,345');
    expect(fmtINR(123456)).toBe('₹1,23,456');
    expect(fmtINR(1234567)).toBe('₹12,34,567');
    expect(fmtINR(12345678)).toBe('₹1,23,45,678');
    expect(fmtINR(123456789)).toBe('₹12,34,56,789');
  });

  it('renders negative amounts with a Unicode minus prefix', () => {
    expect(fmtINR(-150)).toBe('−₹150');
    expect(fmtINR(-12345)).toBe('−₹12,345');
  });

  it('opts.sign forces a leading + on positive amounts', () => {
    expect(fmtINR(1000, { sign: true })).toBe('+₹1,000');
    expect(fmtINR(0, { sign: true })).toBe('+₹0');
    expect(fmtINR(-1000, { sign: true })).toBe('−₹1,000');
  });

  it('opts.decimals keeps requested precision', () => {
    expect(fmtINR(1234.5, { decimals: 2 })).toBe('₹1,234.50');
    expect(fmtINR(1234.5, { decimals: 1 })).toBe('₹1,234.5');
  });

  it('rounds half-away-from-zero when decimals is 0', () => {
    expect(fmtINR(1.4)).toBe('₹1');
    expect(fmtINR(1.5)).toBe('₹2');
    expect(fmtINR(-1.5)).toBe('−₹2');
  });

  it('handles NaN and Infinity defensively', () => {
    expect(fmtINR(NaN)).toBe('₹0');
    expect(fmtINR(Infinity)).toBe('₹0');
    expect(fmtINR(-Infinity)).toBe('₹0');
  });
});

describe('fmtINRSigned', () => {
  it('always shows a sign', () => {
    expect(fmtINRSigned(0)).toBe('+₹0');
    expect(fmtINRSigned(5)).toBe('+₹5');
    expect(fmtINRSigned(-5)).toBe('−₹5');
  });
});
