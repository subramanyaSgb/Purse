import { createElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { useUiStore } from '@/state/uiStore';
import { accountsRepo } from '@/repo/accounts';
import { categoriesRepo } from '@/repo/categories';
import { subcategoriesRepo } from '@/repo/subcategories';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { tagsRepo } from '@/repo/tags';
import { iconByName } from '@/components/forms/iconOptions';
import { fmtINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/domain/types';

/**
 * One row in the Activity list. The row is intentionally tabular: icon,
 * note-or-category, subtitle (sub · account · method), amount with sign,
 * time. The icon tints come from the linked category's stored colour.
 *
 * We resolve account / category / subcategory / paymentMethod via React
 * Query so the row stays reactive when those entities change. The lists
 * are tiny relative to transactions, so re-querying per render is cheap
 * (and cached).
 */
export function TransactionRow({
  tx,
  onClick,
  compact = false,
}: {
  tx: Transaction;
  /** Override: defaults to opening the global detail sheet via useUiStore. */
  onClick?: (tx: Transaction) => void;
  compact?: boolean;
}) {
  const setDetailTxId = useUiStore((s) => s.setDetailTxId);
  const handleClick = onClick ?? ((t: Transaction) => setDetailTxId(t.id));

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsRepo.list({ includeArchived: true }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesRepo.list({ includeArchived: true }),
  });
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', 'all'],
    queryFn: () => subcategoriesRepo.list({ includeArchived: true }),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsRepo.list({ includeArchived: true }),
  });
  const { data: pendingTag } = useQuery({
    queryKey: ['tag-by-name', 'reimburse-pending'],
    queryFn: () => tagsRepo.findByName('reimburse-pending'),
  });

  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : undefined;
  const category = tx.categoryId ? categories.find((c) => c.id === tx.categoryId) : undefined;
  const subcategory = tx.subcategoryId
    ? subcategories.find((s) => s.id === tx.subcategoryId)
    : undefined;
  const method = tx.paymentMethodId ? methods.find((m) => m.id === tx.paymentMethodId) : undefined;

  // Picking icon + tint: transfer uses a static arrow + transfer colour;
  // expense / income use the category's icon and colour.
  const isTransfer = tx.kind === 'transfer';
  const tint = isTransfer
    ? 'var(--color-transfer)'
    : (category?.colour ?? (tx.kind === 'income' ? 'var(--color-income)' : 'var(--color-expense)'));

  const sign = tx.kind === 'expense' ? '−' : tx.kind === 'income' ? '+' : '';
  const amountTone =
    tx.kind === 'expense'
      ? 'var(--color-foreground)'
      : tx.kind === 'income'
        ? 'var(--color-income)'
        : 'var(--color-transfer)';

  const hasReimburse = !!pendingTag && tx.tagIds.includes(pendingTag.id);
  const title = tx.note?.trim() || category?.name || (isTransfer ? 'Transfer' : '—');
  const subtitleBits = isTransfer
    ? [account?.name, toAccount?.name].filter(Boolean).join(' → ')
    : [subcategory?.name ?? category?.name, account?.name, method?.name]
        .filter(Boolean)
        .join(' · ');
  const time = formatTime(tx.occurredAt);

  return (
    <button
      type="button"
      onClick={() => handleClick(tx)}
      className={cn(
        'border-border flex w-full items-center gap-3 border-b text-left transition-colors last:border-b-0 hover:bg-white/[0.02]',
        compact ? 'px-3 py-3' : 'px-4 py-3.5',
      )}
    >
      <span
        aria-hidden
        className={cn('grid place-items-center rounded-xl', compact ? 'size-9' : 'size-10')}
        style={{
          background: `color-mix(in srgb, ${tint} 16%, transparent)`,
          color: tint,
        }}
      >
        {isTransfer ? (
          <ArrowLeftRight className="size-[18px]" strokeWidth={1.8} aria-hidden />
        ) : tx.kind === 'income' ? (
          <ArrowDownLeft className="size-[18px]" strokeWidth={1.8} aria-hidden />
        ) : (
          createElement(iconByName(category?.icon ?? 'wallet'), {
            className: 'size-[18px]',
            strokeWidth: 1.8,
            'aria-hidden': true,
          })
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{title}</span>
          {hasReimburse ? (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider uppercase"
              style={{
                background: 'rgba(255,179,71,0.14)',
                color: 'var(--color-warn)',
              }}
            >
              Reimburse
            </span>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-0.5 truncate text-[11.5px]">
          {subtitleBits || category?.name || ''}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className="font-mono tabular text-sm font-semibold tracking-tight"
          style={{ color: amountTone }}
        >
          {sign}
          {fmtINR(tx.amount)}
        </div>
        <div className="font-mono mt-0.5 text-[10.5px]" style={{ color: 'var(--color-ink-faint)' }}>
          {time}
        </div>
      </div>
    </button>
  );
}

function formatTime(isoUtc: string): string {
  const d = new Date(isoUtc);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
