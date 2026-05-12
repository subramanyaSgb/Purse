import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Flame } from 'lucide-react';
import { tagsRepo } from '@/repo/tags';
import { transactionsRepo } from '@/repo/transactions';
import { fmtINR } from '@/lib/format';

/**
 * Visible only if there are any expenses tagged 'reimburse-pending' in the
 * current month. Shows count + total, deep-links to the filtered Activity
 * view (filter wiring lands in Phase 4 Task 4.5).
 */
export function ReimburseChip() {
  const { data: pendingTag } = useQuery({
    queryKey: ['tag-by-name', 'reimburse-pending'],
    queryFn: () => tagsRepo.findByName('reimburse-pending'),
  });

  const { data: txs = [] } = useQuery({
    enabled: !!pendingTag,
    queryKey: ['tx-by-tag', pendingTag?.id],
    // Pull the last 90 days; "pending" rarely lingers past that.
    queryFn: () => {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      return transactionsRepo.listByRange(start, end, { tagId: pendingTag!.id });
    },
  });

  if (!pendingTag || txs.length === 0) return null;
  const total = txs.reduce((s, t) => s + (t.kind === 'expense' ? t.amount : 0), 0);
  const count = txs.filter((t) => t.kind === 'expense').length;
  if (count === 0) return null;

  return (
    <Link
      to="/transactions"
      className="bg-card border-border mx-4 flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-white/[0.02]"
    >
      <span
        aria-hidden
        className="grid size-10 place-items-center rounded-xl"
        style={{ background: 'rgba(255,179,71,0.16)', color: 'var(--color-warn)' }}
      >
        <Flame className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Pending reimbursement</div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          {count} office expense{count === 1 ? '' : 's'} · {fmtINR(total)}
        </div>
      </div>
      <span className="bg-muted border-border text-foreground inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold">
        Review
        <ChevronRight className="size-3" />
      </span>
    </Link>
  );
}
