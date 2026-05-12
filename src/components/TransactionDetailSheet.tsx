import { createElement, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronLeft,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { accountsRepo } from '@/repo/accounts';
import { categoriesRepo } from '@/repo/categories';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { placesRepo } from '@/repo/places';
import { subcategoriesRepo } from '@/repo/subcategories';
import { tagsRepo } from '@/repo/tags';
import { transactionsRepo } from '@/repo/transactions';
import { imagesService, thumbKeyFor } from '@/services/images';
import { iconByName } from '@/components/forms/iconOptions';
import { KIND_TINT } from '@/components/forms/kindTint';
import { fmtINR } from '@/lib/format';
import { BALANCES_QUERY_KEY } from '@/state/useBalances';
import { useUiStore } from '@/state/uiStore';
import type { Transaction } from '@/domain/types';

const dayLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDay(iso: string): string {
  return dayLabelFormatter.format(new Date(iso));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <span
        aria-hidden
        className="bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-md"
      >
        {icon}
      </span>
      <span className="text-muted-foreground flex-1 text-xs">{label}</span>
      <span className="text-foreground text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function DetailBody({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const qc = useQueryClient();
  const setEditingTxId = useUiStore((s) => s.setEditingTxId);

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
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsRepo.list(),
  });
  const { data: place } = useQuery({
    enabled: !!tx.placeId,
    queryKey: ['place', tx.placeId],
    queryFn: () => placesRepo.get(tx.placeId!),
  });

  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : undefined;
  const category = tx.categoryId ? categories.find((c) => c.id === tx.categoryId) : undefined;
  const subcategory = tx.subcategoryId
    ? subcategories.find((s) => s.id === tx.subcategoryId)
    : undefined;
  const method = tx.paymentMethodId ? methods.find((m) => m.id === tx.paymentMethodId) : undefined;
  const txTags = tx.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const isTransfer = tx.kind === 'transfer';
  const tint = isTransfer
    ? KIND_TINT.transfer
    : (category?.colour ?? (tx.kind === 'income' ? KIND_TINT.income : KIND_TINT.expense));
  const sign = tx.kind === 'expense' ? '−' : tx.kind === 'income' ? '+' : '';
  const amountTone =
    tx.kind === 'expense'
      ? KIND_TINT.expense
      : tx.kind === 'income'
        ? KIND_TINT.income
        : KIND_TINT.transfer;

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const key of tx.images) {
        try {
          const blob = await imagesService.loadBlob(thumbKeyFor(key));
          const url = URL.createObjectURL(blob);
          urls.push(url);
          next[key] = url;
        } catch {
          // ignore missing thumb
        }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => {
      cancelled = true;
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [tx.images]);

  const remove = useMutation({
    mutationFn: () => transactionsRepo.remove(tx.id),
  });
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await remove.mutateAsync();
    void qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: ['tx-range'] });
    void qc.invalidateQueries({ queryKey: ['tx-by-tag'] });
    onClose();
  }

  function handleEdit() {
    onClose();
    setEditingTxId(tx.id);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="bg-card border-border text-foreground grid size-9 place-items-center rounded-full border"
        >
          <ChevronLeft className="size-[18px]" aria-hidden />
        </button>
        <span className="font-display text-sm font-semibold">Transaction</span>
        <button
          type="button"
          aria-label="More"
          className="bg-card border-border text-foreground grid size-9 place-items-center rounded-full border opacity-60"
          disabled
        >
          <MoreVertical className="size-[18px]" aria-hidden />
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 pt-4 pb-5 text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-2xl"
          style={{
            background: `color-mix(in srgb, ${tint} 16%, transparent)`,
            color: tint,
          }}
        >
          {isTransfer ? (
            <ArrowLeftRight className="size-7" strokeWidth={1.8} />
          ) : tx.kind === 'income' ? (
            <ArrowDownLeft className="size-7" strokeWidth={1.8} />
          ) : (
            createElement(iconByName(category?.icon ?? 'wallet'), {
              className: 'size-7',
              strokeWidth: 1.8,
            })
          )}
        </span>
        <div className="text-muted-foreground mt-3 text-xs font-medium">
          {isTransfer
            ? 'Transfer'
            : `${category?.name ?? '—'}${subcategory ? ` · ${subcategory.name}` : ''}`}
        </div>
        <div
          className="font-display tabular mt-1 text-5xl leading-none font-bold tracking-tight"
          style={{ color: amountTone }}
        >
          {sign}
          {fmtINR(tx.amount)}
        </div>
        <div className="font-mono mt-2 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          {formatDay(tx.occurredAt)} · {formatTime(tx.occurredAt)}
        </div>
      </div>

      {/* Note card */}
      {tx.note ? (
        <div className="bg-card border-border mx-4 mb-3 rounded-2xl border p-4">
          <div
            className="text-[10.5px] font-semibold tracking-wider uppercase"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            Note
          </div>
          <p className="text-foreground mt-1 text-sm font-medium">{tx.note}</p>
        </div>
      ) : null}

      {/* Detail rows */}
      <div className="bg-card border-border mx-4 mb-3 overflow-hidden rounded-2xl border">
        <DetailRow
          icon={<span className="text-[11px] font-bold">A</span>}
          label="Account"
          value={
            isTransfer
              ? `${account?.name ?? '?'} → ${toAccount?.name ?? '?'}`
              : (account?.name ?? '—')
          }
        />
        {method ? (
          <DetailRow
            icon={<span className="text-[11px] font-bold">P</span>}
            label="Payment method"
            value={method.name}
          />
        ) : null}
        {place ? (
          <DetailRow
            icon={<span className="text-[11px] font-bold">L</span>}
            label="Place"
            value={place.name}
          />
        ) : null}
        {txTags.length > 0 ? (
          <DetailRow
            icon={<span className="text-[11px] font-bold">#</span>}
            label="Tags"
            value={
              <span className="flex flex-wrap justify-end gap-1">
                {txTags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{
                      background: 'rgba(255,179,71,0.16)',
                      color: 'var(--color-warn)',
                    }}
                  >
                    #{t.name}
                  </span>
                ))}
              </span>
            }
          />
        ) : null}
      </div>

      {/* Receipt strip */}
      {tx.images.length > 0 ? (
        <div className="px-4 pb-3">
          <div
            className="mb-2 text-[10.5px] font-semibold tracking-wider uppercase"
            style={{ color: 'var(--color-ink-faint)' }}
          >
            Receipt
          </div>
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto">
            {tx.images.map((key, idx) => (
              <div
                key={key}
                className="bg-muted border-border size-[88px] shrink-0 overflow-hidden rounded-xl border"
              >
                {thumbs[key] ? (
                  <img
                    src={thumbs[key]}
                    alt={`Receipt ${idx + 1}`}
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-2 flex gap-2 px-4 pb-6">
        <Button variant="outline" onClick={handleEdit} className="flex-1 gap-2">
          <Pencil className="size-4" aria-hidden /> Edit
        </Button>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={remove.isPending}
          className="flex-1 gap-2"
          style={{
            background: 'rgba(255,136,102,0.10)',
            borderColor: 'rgba(255,136,102,0.3)',
            color: 'var(--color-expense)',
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {remove.isPending ? 'Deleting…' : confirming ? 'Confirm delete' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}

export function TransactionDetailSheet() {
  const detailTxId = useUiStore((s) => s.detailTxId);
  const setDetailTxId = useUiStore((s) => s.setDetailTxId);

  const open = !!detailTxId;
  const { data: tx } = useQuery({
    enabled: open,
    queryKey: ['tx', detailTxId],
    queryFn: () => transactionsRepo.get(detailTxId!),
  });

  function handleOpenChange(next: boolean) {
    if (!next) setDetailTxId(null);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-hidden p-0">
        {open && tx ? <DetailBody key={tx.id} tx={tx} onClose={() => setDetailTxId(null)} /> : null}
      </SheetContent>
    </Sheet>
  );
}
