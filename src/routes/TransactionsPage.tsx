import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { TransactionRow } from '@/components/TransactionRow';
import { transactionsRepo, type TxFilters } from '@/repo/transactions';
import { fmtINR } from '@/lib/format';
import {
  endOfMonthIST,
  startOfLastNDaysIST,
  startOfMonthIST,
  startOfWeekIST,
  endOfWeekIST,
} from '@/lib/dateRange';
import { useUiStore, type RangePreset } from '@/state/uiStore';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/domain/types';

const RANGE_CHIPS: { id: RangePreset; label: string }[] = [
  { id: 'thisMonth', label: 'Month' },
  { id: 'last7d', label: 'Week' },
  { id: 'last30d', label: '30 days' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'allTime', label: 'All' },
];

function boundsFor(preset: RangePreset, now: Date = new Date()): { start: string; end: string } {
  switch (preset) {
    case 'thisMonth':
      return { start: startOfMonthIST(now), end: endOfMonthIST(now) };
    case 'last7d':
      return { start: startOfWeekIST(now), end: endOfWeekIST(now) };
    case 'last30d':
      return { start: startOfLastNDaysIST(now, 30), end: new Date().toISOString() };
    case 'lastMonth': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { start: startOfMonthIST(lastMonth), end: endOfMonthIST(lastMonth) };
    }
    case 'allTime':
      return { start: '1970-01-01T00:00:00.000Z', end: new Date(2999, 0).toISOString() };
  }
}

/** Bucket transactions by their IST-local date string for the day-group headers. */
function groupByDay(txs: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    const istMs = new Date(t.occurredAt).getTime() + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);
    // Format: '2026-05-12' as the stable key, label derived below.
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
  // key = YYYY-MM-DD
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

/** Net (income − expense), transfers excluded, for the day's totals line. */
function dayNet(txs: Transaction[]): number {
  return txs.reduce((s, t) => {
    if (t.kind === 'income') return s + t.amount;
    if (t.kind === 'expense') return s - t.amount;
    return s;
  }, 0);
}

export default function TransactionsPage() {
  const range = useUiStore((s) => s.transactionListRange);
  const setRange = useUiStore((s) => s.setTransactionListRange);

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const filters: TxFilters = deferredQuery.trim() ? { search: deferredQuery.trim() } : {};

  const { start, end } = useMemo(() => boundsFor(range), [range]);
  const { data: txs = [], isLoading } = useQuery({
    queryKey: ['tx-range', start, end, deferredQuery],
    queryFn: () => transactionsRepo.listByRange(start, end, filters),
  });

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
            aria-label="Filters"
            className="bg-card border-border text-foreground grid size-9 place-items-center rounded-full border"
          >
            <Filter className="size-[16px]" aria-hidden />
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
      <div className="scrollbar-hidden flex gap-2 overflow-x-auto px-4 py-3">
        {RANGE_CHIPS.map((c) => {
          const on = c.id === range;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setRange(c.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                on
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border-border text-foreground border',
              )}
              aria-pressed={on}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-12">
        {isLoading ? null : groups.size === 0 ? (
          <p
            role="status"
            className="text-muted-foreground border-border rounded-2xl border border-dashed py-12 text-center text-sm"
          >
            {deferredQuery.trim()
              ? `No transactions match "${deferredQuery.trim()}" in this range.`
              : 'No transactions in this range. Tap + to add one.'}
          </p>
        ) : (
          // Newest day at top. occurredAt desc inside each group is already
          // guaranteed by transactionsRepo.listByRange.
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
    </>
  );
}
