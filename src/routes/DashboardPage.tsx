import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { appMetaRepo } from '@/repo/appMeta';
import { transactionsRepo } from '@/repo/transactions';
import { HeroBalanceCard } from '@/components/HeroBalanceCard';
import { AccountsStrip, SectionHead } from '@/components/AccountsStrip';
import { ReimburseChip } from '@/components/ReimburseChip';
import { TransactionRow } from '@/components/TransactionRow';
import { startOfLastNDaysIST } from '@/lib/dateRange';

const APP_META_QUERY_KEY = ['appMeta'] as const;

function greetingFor(d = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatter.format(d);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function DashboardPage() {
  const { data: meta } = useQuery({
    queryKey: APP_META_QUERY_KEY,
    queryFn: () => appMetaRepo.get(),
  });

  // Recent activity: last 30 days, top 5 by occurredAt desc.
  const start = useMemo(() => startOfLastNDaysIST(new Date(), 30), []);
  const end = useMemo(() => new Date().toISOString(), []);
  const { data: recentAll = [] } = useQuery({
    queryKey: ['tx-range', start, end, 'dashboard'],
    queryFn: () => transactionsRepo.listByRange(start, end),
  });
  const recent = recentAll.slice(0, 5);

  const greeting = greetingFor();
  const userName = meta?.userName?.trim() || 'there';
  const initials = initialsFor(meta?.userName?.trim() || 'P');

  return (
    <>
      {/* Inline header (custom — Dashboard wants the greeting style) */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs font-medium">{greeting}</div>
          <h1 className="font-display mt-0.5 truncate text-xl font-semibold tracking-tight">
            Namaste, {userName}.
          </h1>
        </div>
        <Link
          to="/settings"
          aria-label="Profile and settings"
          className="bg-card border-border text-foreground font-display grid size-10 shrink-0 place-items-center rounded-full border text-sm font-semibold"
        >
          {initials}
        </Link>
      </header>

      <HeroBalanceCard />

      <div className="mt-4">
        <ReimburseChip />
      </div>

      <AccountsStrip />

      <section>
        <SectionHead title="Recent activity" to="/transactions" actionLabel="See all" />
        {recent.length === 0 ? (
          <p
            role="status"
            className="text-muted-foreground border-border mx-4 rounded-2xl border border-dashed py-10 text-center text-sm"
          >
            No transactions yet. Tap the + to add your first.
          </p>
        ) : (
          <div className="border-border bg-card mx-4 overflow-hidden rounded-2xl border">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} compact />
            ))}
          </div>
        )}
      </section>

      {/* FAB is shared across tx-creating screens — Phase 4 wires the
          AddTransactionSheet behind it. For now, link to /transactions. */}
      <Link
        to="/transactions"
        aria-label="Add transaction"
        className="bg-primary text-primary-foreground fixed right-5 bottom-24 z-20 grid size-14 place-items-center rounded-full shadow-2xl"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
      >
        <Plus aria-hidden className="size-6" strokeWidth={2.5} />
      </Link>

      <div className="h-8" />
    </>
  );
}
