import { useQuery } from '@tanstack/react-query';
import { transactionsRepo } from '@/repo/transactions';
import { useBalances } from '@/state/useBalances';
import { fmtINR } from '@/lib/format';
import { startOfMonthIST, endOfMonthIST } from '@/lib/dateRange';

/**
 * Hero balance card. Net worth = sum of all account balances (via
 * useBalances). The three stat columns below derive Earned / Spent / Saved
 * from the current month's transactions:
 *   Earned   sum(income.amount)        for the IST month
 *   Spent    sum(expense.amount)       for the IST month
 *   Saved    Earned − Spent
 * Transfers are excluded — they're a balance shuffle, not P&L.
 */
export function HeroBalanceCard() {
  const { balances } = useBalances();
  const netWorth = [...balances.values()].reduce((s, v) => s + v, 0);

  const start = startOfMonthIST(new Date());
  const end = endOfMonthIST(new Date());

  const { data: monthTxs = [] } = useQuery({
    queryKey: ['tx-range', start, end],
    queryFn: () => transactionsRepo.listByRange(start, end),
  });

  let earned = 0;
  let spent = 0;
  for (const t of monthTxs) {
    if (t.kind === 'income') earned += t.amount;
    else if (t.kind === 'expense') spent += t.amount;
  }
  const saved = earned - spent;

  return (
    <div
      className="border-border relative mx-4 overflow-hidden rounded-3xl border p-6"
      style={{
        background:
          'radial-gradient(140% 100% at 0% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 60%), linear-gradient(155deg, #1A1814 0%, #14120D 50%, #221F18 100%)',
      }}
    >
      {/* Subtle SVG film grain — pure decoration */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen opacity-[0.06]"
      >
        <filter id="hero-grain">
          <feTurbulence baseFrequency="0.9" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full bg-white/5 py-1 pr-3 pl-2">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: 'var(--color-primary)' }}
          />
          <span className="text-muted-foreground text-[11px] font-semibold tracking-wider">
            NET WORTH
          </span>
        </div>
        <span className="text-muted-foreground rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold">
          This month
        </span>
      </div>

      <div className="font-display text-foreground tabular relative mt-4 flex items-baseline gap-1 text-5xl leading-none font-bold tracking-tight">
        <span className="text-muted-foreground mr-1 text-2xl">₹</span>
        <span>{fmtINR(netWorth).replace('₹', '')}</span>
      </div>

      <div className="relative mt-5 flex items-stretch gap-5">
        <HeroStat label="Earned" amount={earned} tone="income" />
        <span aria-hidden className="bg-border w-px" />
        <HeroStat label="Spent" amount={spent} tone="expense" />
        <span aria-hidden className="bg-border w-px" />
        <HeroStat label="Saved" amount={saved} tone="ink" mono />
      </div>
    </div>
  );
}

function HeroStat({
  label,
  amount,
  tone,
  mono = false,
}: {
  label: string;
  amount: number;
  tone: 'income' | 'expense' | 'ink';
  mono?: boolean;
}) {
  const colorVar =
    tone === 'income'
      ? 'var(--color-income)'
      : tone === 'expense'
        ? 'var(--color-expense)'
        : 'var(--color-foreground)';

  return (
    <div className="min-w-0 flex-1">
      <div
        className="text-[10.5px] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {label}
      </div>
      <div
        className={
          mono
            ? 'font-mono tabular text-base font-semibold'
            : 'font-display tabular text-base font-semibold'
        }
        style={{ color: colorVar }}
      >
        {fmtINR(amount)}
      </div>
    </div>
  );
}
