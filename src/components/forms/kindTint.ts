import type { TxKind } from '@/domain/types';

/** Tint shared across the Add/Edit sheet hero amount + save button. */
export const KIND_TINT: Record<TxKind, string> = {
  expense: 'var(--color-expense)',
  income: 'var(--color-income)',
  transfer: 'var(--color-transfer)',
};

/** 18%-alpha background per kind for the segmented pill. */
export const KIND_SOFT_BG: Record<TxKind, string> = {
  expense: 'rgba(255,136,102,0.18)',
  income: 'rgba(182,232,74,0.18)',
  transfer: 'rgba(156,141,255,0.18)',
};

/** Save button accent ink (matches Concierge `--accentInk`). */
export const KIND_INK: Record<TxKind, string> = {
  expense: '#1A0A06',
  income: '#0A1206',
  transfer: '#14102A',
};

export const KIND_LABEL: Record<TxKind, string> = {
  expense: 'expense',
  income: 'income',
  transfer: 'transfer',
};
