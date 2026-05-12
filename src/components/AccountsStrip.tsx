import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { accountsRepo } from '@/repo/accounts';
import { useBalances } from '@/state/useBalances';
import { fmtINR } from '@/lib/format';

const ACCOUNTS_QUERY_KEY = ['accounts'] as const;

/** Horizontal scroll of active accounts with live balances. */
export function AccountsStrip() {
  const { data: accounts = [] } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => accountsRepo.list(),
  });
  const { balances } = useBalances();

  if (accounts.length === 0) return null;

  return (
    <section>
      <SectionHead title="Accounts" to="/settings/accounts" actionLabel="Manage" />
      <div className="scrollbar-hidden flex gap-3 overflow-x-auto px-4 pb-1">
        {accounts.map((a) => {
          const bal = balances.get(a.id) ?? a.openingBalance;
          return (
            <Link
              key={a.id}
              to={`/transactions?account=${encodeURIComponent(a.id)}`}
              className="bg-card border-border relative min-w-[170px] overflow-hidden rounded-2xl border p-4 transition-colors hover:bg-white/[0.02]"
            >
              <span
                aria-hidden
                className="absolute -top-6 -right-6 size-20 rounded-full opacity-20"
                style={{ background: `radial-gradient(circle, ${a.colour}, transparent 70%)` }}
              />
              <div className="relative mb-3 flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: a.colour }}
                />
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  {a.type}
                </span>
              </div>
              <div className="relative truncate text-sm font-semibold">{a.name}</div>
              <div
                className="font-mono tabular relative mt-1 text-base font-semibold tracking-tight"
                style={{ color: bal < 0 ? 'var(--color-expense)' : 'var(--color-foreground)' }}
              >
                {fmtINR(bal)}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SectionHead({
  title,
  to,
  actionLabel,
}: {
  title: string;
  to?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mt-6 mb-3 flex items-baseline justify-between px-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {to && actionLabel ? (
        <Link
          to={to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold"
        >
          {actionLabel}
          <ChevronRight className="size-3" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
