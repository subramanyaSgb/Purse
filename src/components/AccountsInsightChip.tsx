import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Sparkle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { accountsRepo } from '@/repo/accounts';
import { useBalances } from '@/state/useBalances';
import { fmtINR } from '@/lib/format';

/**
 * Soft-info insight card at the bottom of /accounts.
 *
 * v0.1 only surfaces a single signal: any card-type account with a
 * negative balance reads as 'You owe ₹X on <Name> — review now'. The
 * design shows a friendlier 'pays its bill in 6 days' message; that
 * requires a billing-cycle field we don't track yet, so we keep the
 * shape and graphics but match what we actually know.
 *
 * Hides itself when there's nothing actionable.
 */
export function AccountsInsightChip() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsRepo.list(),
  });
  const { balances } = useBalances();

  // Card with the deepest negative balance.
  const debtor = accounts
    .filter((a) => a.type === 'card')
    .map((a) => ({ a, bal: balances.get(a.id) ?? a.openingBalance }))
    .filter((x) => x.bal < 0)
    .sort((a, b) => a.bal - b.bal)[0];

  if (!debtor) return null;
  const owed = Math.abs(debtor.bal);

  return (
    <Link
      to={`/transactions`}
      className="bg-card border-border mx-4 mt-3 flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-white/[0.02]"
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-primary)',
        }}
      >
        <Sparkle className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          You owe {fmtINR(owed)} on {debtor.a.name}
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--color-muted-foreground)' }}>
          Tap to review the recent activity
        </div>
      </div>
      <ChevronRight
        className="size-4 shrink-0"
        style={{ color: 'var(--color-ink-faint)' }}
        aria-hidden
      />
    </Link>
  );
}
