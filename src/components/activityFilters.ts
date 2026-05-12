import type { TxKind } from '@/domain/types';

/**
 * Filter values held in page state and applied to listByRange.
 * The repo's TxFilters supports single-id filters per dimension; the
 * filter sheet allows many. TransactionsPage projects the multi-select
 * sets and applies the remaining matches in memory after the fetch.
 */
export type ActivityFilters = {
  accountIds: string[];
  categoryIds: string[];
  paymentMethodIds: string[];
  tagIds: string[];
  kinds: TxKind[];
};

export const EMPTY_FILTERS: ActivityFilters = {
  accountIds: [],
  categoryIds: [],
  paymentMethodIds: [],
  tagIds: [],
  kinds: [],
};

export function activeFilterCount(f: ActivityFilters): number {
  return (
    f.accountIds.length +
    f.categoryIds.length +
    f.paymentMethodIds.length +
    f.tagIds.length +
    f.kinds.length
  );
}
