import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { accountsRepo } from '@/repo/accounts';
import { useBalances } from '@/state/useBalances';
import { fmtINR } from '@/lib/format';
import type { Account } from '@/domain/types';

const ACCOUNTS_QUERY_KEY = ['accounts'] as const;

/** Accounts marked 'rd' or 'savings' are treated as locked (long-term). */
const LOCKED_TYPES = new Set<Account['type']>(['rd', 'savings']);

export default function AccountsPage() {
  const { data: accounts = [] } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => accountsRepo.list(),
  });
  const { balances } = useBalances();

  const balanceOf = (a: Account) => balances.get(a.id) ?? a.openingBalance;
  const total = accounts.reduce((s, a) => s + balanceOf(a), 0);
  const liquid = accounts
    .filter((a) => !LOCKED_TYPES.has(a.type))
    .reduce((s, a) => s + balanceOf(a), 0);
  const locked = accounts
    .filter((a) => LOCKED_TYPES.has(a.type))
    .reduce((s, a) => s + balanceOf(a), 0);

  return (
    <>
      <Header
        title="Accounts"
        large
        actions={
          <Link
            to="/settings/accounts"
            aria-label="Add account"
            className="bg-card border-border text-foreground grid size-9 place-items-center rounded-full border"
          >
            <Plus className="size-[18px]" aria-hidden />
          </Link>
        }
      />

      {/* Total balance hero */}
      <section className="px-4 pt-4 pb-3">
        <div
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          Total balance
        </div>
        <div className="font-display tabular mt-1 text-4xl font-bold tracking-tight">
          {fmtINR(total)}
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-4 text-xs">
          <LegendDot tint="var(--color-income)" label="Liquid" amount={liquid} />
          <LegendDot tint="var(--color-transfer)" label="Locked" amount={locked} />
        </div>
      </section>

      {/* Active list */}
      <section className="px-4 pt-2 pb-4">
        <div
          className="mb-2 text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          Active
        </div>
        {accounts.length === 0 ? (
          <p
            role="status"
            className="text-muted-foreground border-border rounded-2xl border border-dashed py-10 text-center text-sm"
          >
            No accounts yet. Tap + to add one.
          </p>
        ) : (
          <div className="bg-card border-border overflow-hidden rounded-2xl border">
            {accounts.map((a, i) => {
              const bal = balanceOf(a);
              const initial = (a.name[0] ?? '?').toUpperCase();
              return (
                <Link
                  key={a.id}
                  to="/settings/accounts"
                  className="border-border flex items-center gap-3 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  style={{ borderColor: i === accounts.length - 1 ? 'transparent' : undefined }}
                >
                  <span
                    aria-hidden
                    className="font-display grid size-11 place-items-center rounded-xl text-base font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${a.colour} 0%, color-mix(in srgb, ${a.colour} 60%, #000) 100%)`,
                      color: '#0A0908',
                    }}
                  >
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="text-muted-foreground mt-0.5 text-[11.5px] capitalize">
                      {a.type}
                      {LOCKED_TYPES.has(a.type) ? ' · locked' : ''}
                      {a.bankName ? ` · ${a.bankName}` : ''}
                    </div>
                  </div>
                  <div
                    className="font-mono tabular shrink-0 text-sm font-semibold tracking-tight"
                    style={{ color: bal < 0 ? 'var(--color-expense)' : 'var(--color-foreground)' }}
                  >
                    {fmtINR(bal)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function LegendDot({ tint, label, amount }: { tint: string; label: string; amount: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: tint }} />
      {label} {fmtINR(amount)}
    </span>
  );
}
