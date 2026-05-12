import { useDeferredValue, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Plus, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { TransactionRow } from '@/components/TransactionRow';
import { TransactionFilterSheet } from '@/components/TransactionFilterSheet';
import { DateRangeChips } from '@/components/DateRangeChips';
import {
  EMPTY_FILTERS,
  activeFilterCount,
  type ActivityFilters,
} from '@/components/activityFilters';
import { transactionsRepo, type TxFilters } from '@/repo/transactions';
import { fmtINR } from '@/lib/format';
import { boundsFor } from '@/lib/dateRange';
import { useUiStore } from '@/state/uiStore';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/domain/types';

/** Bucket transactions by their IST-local date string for the day-group headers. */
function groupByDay(txs: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    const istMs = new Date(t.occurredAt).getTime() + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);
    const key = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return groups;
}

const dayLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function dayLabel(key: string, today: Date): string {
  const parts = key.split('-').map(Number) as [number, number, number];
  const [y, m, d] = parts;
  const todayIstMs = today.getTime() + 5.5 * 60 * 60 * 1000;
  const todayIst = new Date(todayIstMs);
  const yKey = `${todayIst.getUTCFullYear()}-${String(todayIst.getUTCMonth() + 1).padStart(2, '0')}-${String(todayIst.getUTCDate()).padStart(2, '0')}`;
  if (key === yKey) return 'Today';
  const yesterdayIst = new Date(todayIstMs - 86_400_000);
  const yyKey = `${yesterdayIst.getUTCFullYear()}-${String(yesterdayIst.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayIst.getUTCDate()).padStart(2, '0')}`;
  if (key === yyKey) return 'Yesterday';
  return dayLabelFormatter.format(new Date(y!, m! - 1, d!));
}

function dayNet(txs: Transaction[]): number {
  return txs.reduce((s, t) => {
    if (t.kind === 'income') return s + t.amount;
    if (t.kind === 'expense') return s - t.amount;
    return s;
  }, 0);
}

/**
 * Phase 4 v0.1 multi-select projection: the repo's TxFilters supports one
 * id per dimension; the filter sheet allows many. The single 'kind' filter
 * gets pushed into TxFilters when exactly one kind is selected (still
 * benefiting from the compound `[kind+occurredAt]` index); other multi-
 * select filters are applied in memory after the fetch. For tiny N this
 * is acceptable; a richer repo-level OR filter is a future task.
 */
function applyMultiSelect(rows: Transaction[], f: ActivityFilters): Transaction[] {
  return rows.filter((r) => {
    if (f.kinds.length > 0 && !f.kinds.includes(r.kind)) return false;
    if (f.accountIds.length > 0 && !f.accountIds.includes(r.accountId)) return false;
    if (f.categoryIds.length > 0 && (!r.categoryId || !f.categoryIds.includes(r.categoryId)))
      return false;
    if (
      f.paymentMethodIds.length > 0 &&
      (!r.paymentMethodId || !f.paymentMethodIds.includes(r.paymentMethodId))
    )
      return false;
    if (f.tagIds.length > 0 && !r.tagIds.some((id) => f.tagIds.includes(id))) return false;
    return true;
  });
}

export default function TransactionsPage() {
  const range = useUiStore((s) => s.transactionListRange);
  const setRange = useUiStore((s) => s.setTransactionListRange);
  const openAddTx = useUiStore((s) => s.openAddTx);
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Deep-link entry points: ReimburseChip and AccountsStrip set search
  // params like ?tag=<id> and ?account=<id>. We seed the filter state
  // from those on first render so the user arrives on a pre-filtered
  // list.
  const initialFilters: ActivityFilters = useMemo(() => {
    const f = { ...EMPTY_FILTERS };
    const tagId = searchParams.get('tag');
    const accountId = searchParams.get('account');
    if (tagId) f.tagIds = [tagId];
    if (accountId) f.accountIds = [accountId];
    return f;
    // Intentionally read once at mount; subsequent navigation within the
    // page is via the filter sheet, not URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<ActivityFilters>(initialFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const activeCount = activeFilterCount(filters);

  const repoFilters: TxFilters = {};
  if (deferredQuery.trim()) repoFilters.search = deferredQuery.trim();
  if (filters.kinds.length === 1) repoFilters.kind = filters.kinds[0];

  const { start, end } = useMemo(() => boundsFor(range), [range]);
  const { data: rawTxs = [], isLoading } = useQuery({
    queryKey: ['tx-range', start, end, deferredQuery, JSON.stringify(repoFilters)],
    queryFn: () => transactionsRepo.listByRange(start, end, repoFilters),
  });

  const txs = useMemo(() => applyMultiSelect(rawTxs, filters), [rawTxs, filters]);
  const groups = useMemo(() => groupByDay(txs), [txs]);
  const today = useMemo(() => new Date(), []);

  return (
    <>
      <Header
        title="Activity"
        large
        actions={
          <button
            type="button"
            aria-label={activeCount === 0 ? 'Filters' : `Filters (${activeCount} active)`}
            onClick={() => setFilterSheetOpen(true)}
            className={cn(
              'border-border text-foreground relative grid size-9 place-items-center rounded-full border',
              activeCount === 0 ? 'bg-card' : 'bg-accent',
            )}
          >
            <Filter className="size-[16px]" aria-hidden />
            {activeCount > 0 ? (
              <span
                aria-hidden
                className="bg-primary text-primary-foreground tabular absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
              >
                {activeCount}
              </span>
            ) : null}
          </button>
        }
      />

      {/* Search */}
      <div className="px-4 pt-2">
        <div className="bg-card border-border flex items-center gap-2 rounded-full border px-3 py-2">
          <Search
            className="size-[15px] shrink-0"
            style={{ color: 'var(--color-muted-foreground)' }}
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, places…"
            aria-label="Search transactions"
            className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Range chips */}
      <div className="px-4 py-3">
        <DateRangeChips value={range} onChange={setRange} />
      </div>

      <div className="flex flex-col gap-3 px-4 pb-28">
        {isLoading ? null : groups.size === 0 ? (
          <p
            role="status"
            className="text-muted-foreground border-border rounded-2xl border border-dashed py-12 text-center text-sm"
          >
            {deferredQuery.trim() || activeCount > 0
              ? 'No transactions match the current filters.'
              : 'No transactions in this range. Tap + to add one.'}
          </p>
        ) : (
          Array.from(groups.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, items]) => {
              const net = dayNet(items);
              return (
                <section key={key} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between px-1">
                    <span
                      className="text-[11px] font-semibold tracking-wider uppercase"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      {dayLabel(key, today)}
                    </span>
                    <span
                      className="font-mono tabular text-[11.5px]"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      {fmtINR(net, { sign: true })}
                    </span>
                  </div>
                  <div className="bg-card border-border overflow-hidden rounded-2xl border">
                    {items.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                </section>
              );
            })
        )}
      </div>

      <TransactionFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApply={setFilters}
      />

      {/* FAB */}
      <button
        type="button"
        onClick={openAddTx}
        aria-label="Add transaction"
        className="bg-primary text-primary-foreground fixed right-5 bottom-24 z-20 grid size-14 place-items-center rounded-full"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 6px rgba(229,238,92,0.08)' }}
      >
        <Plus className="size-6" strokeWidth={2.5} aria-hidden />
      </button>
    </>
  );
}
