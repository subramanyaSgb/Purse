import { createElement, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AmountHero } from './AmountHero';
import { TxKindToggle } from './TxKindToggle';
import { TxFieldRow } from './TxFieldRow';
import { TagAutocomplete } from './TagAutocomplete';
import { iconByName } from './iconOptions';
import { KIND_TINT, KIND_INK, KIND_LABEL } from './kindTint';
import { accountsRepo } from '@/repo/accounts';
import { appMetaRepo } from '@/repo/appMeta';
import { categoriesRepo } from '@/repo/categories';
import { subcategoriesRepo } from '@/repo/subcategories';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { tagsRepo } from '@/repo/tags';
import { transactionsRepo } from '@/repo/transactions';
import { BALANCES_QUERY_KEY } from '@/state/useBalances';
import { useUiStore } from '@/state/uiStore';
import { fmtINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, Transaction, TxKind } from '@/domain/types';

const OFFICE_CATEGORY_NAME = 'Office';
const REIMBURSE_TAG_NAME = 'reimburse-pending';

/** A transaction draft kept entirely in local state until Save commits. */
type Draft = {
  kind: TxKind;
  amount: number;
  occurredAt: string; // ISO UTC
  accountId: string;
  toAccountId: string;
  categoryId: string;
  subcategoryId: string;
  paymentMethodId: string;
  note: string;
  tagIds: string[];
};

function isoLocalToUtc(localValue: string): string {
  // datetime-local string is interpreted as local time; new Date(localValue)
  // returns the right Date; toISOString gives the UTC ISO needed by Dexie.
  return new Date(localValue).toISOString();
}

function utcToIsoLocal(utc: string): string {
  // Reverse: produce the YYYY-MM-DDTHH:MM string a <input type=datetime-local>
  // expects, in the browser's local timezone.
  const d = new Date(utc);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyDraft(defaultKind: TxKind, defaultAccountId: string | undefined): Draft {
  return {
    kind: defaultKind,
    amount: 0,
    occurredAt: new Date().toISOString(),
    accountId: defaultAccountId ?? '',
    toAccountId: '',
    categoryId: '',
    subcategoryId: '',
    paymentMethodId: '',
    note: '',
    tagIds: [],
  };
}

function draftFromTx(tx: Transaction): Draft {
  return {
    kind: tx.kind,
    amount: tx.amount,
    occurredAt: tx.occurredAt,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId ?? '',
    categoryId: tx.categoryId ?? '',
    subcategoryId: tx.subcategoryId ?? '',
    paymentMethodId: tx.paymentMethodId ?? '',
    note: tx.note,
    tagIds: [...tx.tagIds],
  };
}

function AddTransactionSheetBody({
  initial,
  onClose,
}: {
  initial: Transaction | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  const { data: meta } = useQuery({
    queryKey: ['appMeta'],
    queryFn: () => appMetaRepo.get(),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsRepo.list(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesRepo.list(),
  });
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', 'all'],
    queryFn: () => subcategoriesRepo.list(),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsRepo.list(),
  });
  const { data: pendingTag } = useQuery({
    queryKey: ['tag-by-name', REIMBURSE_TAG_NAME],
    queryFn: () => tagsRepo.findByName(REIMBURSE_TAG_NAME),
  });

  const [draft, setDraft] = useState<Draft>(() =>
    initial
      ? draftFromTx(initial)
      : emptyDraft(meta?.defaultTxKind ?? 'expense', meta?.defaultAccountId),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived values: filter categories / subcategories on render. The
  // *visible* categoryId is the stored value only when it still matches the
  // current kind; otherwise we show 'unselected' without mutating state.
  const filteredCategories = useMemo(
    () => categories.filter((c) => (draft.kind === 'transfer' ? false : c.kind === draft.kind)),
    [categories, draft.kind],
  );
  const visibleCategoryId = filteredCategories.some((c) => c.id === draft.categoryId)
    ? draft.categoryId
    : '';
  const filteredSubs = useMemo(
    () =>
      visibleCategoryId ? subcategories.filter((s) => s.categoryId === visibleCategoryId) : [],
    [subcategories, visibleCategoryId],
  );
  const visibleSubcategoryId = filteredSubs.some((s) => s.id === draft.subcategoryId)
    ? draft.subcategoryId
    : '';

  // Side-effect-free helpers triggered by user actions.
  function setKind(k: TxKind) {
    setDraft((d) => ({
      ...d,
      kind: k,
      // dropping categoryId / subcategoryId is implicit via the derived
      // visibleCategoryId, but we also clear stored state so payloads stay
      // tidy when saving.
      categoryId: '',
      subcategoryId: '',
    }));
  }

  function setCategoryId(id: string) {
    setDraft((d) => {
      const newTagIds = [...d.tagIds];
      // Task 4.14 — Office auto-tag rule. Whenever the user picks the
      // seeded 'Office' category, append the reimburse-pending tag id if
      // we know it. The user can still remove the chip from the
      // TagAutocomplete.
      const picked = categories.find((c) => c.id === id);
      if (
        d.kind === 'expense' &&
        picked &&
        picked.name === OFFICE_CATEGORY_NAME &&
        pendingTag &&
        !newTagIds.includes(pendingTag.id)
      ) {
        newTagIds.push(pendingTag.id);
      }
      return { ...d, categoryId: id, subcategoryId: '', tagIds: newTagIds };
    });
  }

  const create = useMutation({
    mutationFn: () =>
      transactionsRepo.create({
        kind: draft.kind,
        amount: draft.amount,
        currency: meta?.baseCurrency ?? 'INR',
        occurredAt: draft.occurredAt,
        accountId: draft.accountId,
        toAccountId: draft.kind === 'transfer' ? draft.toAccountId : undefined,
        categoryId: draft.kind === 'transfer' ? undefined : visibleCategoryId || undefined,
        subcategoryId: visibleSubcategoryId || undefined,
        paymentMethodId: draft.paymentMethodId || undefined,
        note: draft.note,
        tagIds: draft.tagIds,
        images: initial?.images ?? [],
      }),
  });
  const update = useMutation({
    mutationFn: () =>
      transactionsRepo.update(initial!.id, {
        kind: draft.kind,
        amount: draft.amount,
        occurredAt: draft.occurredAt,
        accountId: draft.accountId,
        toAccountId: draft.kind === 'transfer' ? draft.toAccountId : undefined,
        categoryId: draft.kind === 'transfer' ? undefined : visibleCategoryId || undefined,
        subcategoryId: visibleSubcategoryId || undefined,
        paymentMethodId: draft.paymentMethodId || undefined,
        note: draft.note,
        tagIds: draft.tagIds,
      }),
  });
  const remove = useMutation({
    mutationFn: () => transactionsRepo.remove(initial!.id),
  });

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: ['tx-range'] });
    void qc.invalidateQueries({ queryKey: ['tx-by-tag'] });
  }

  async function handleSave() {
    setError(null);
    // Quick client-side guards — the repo will re-validate.
    if (!draft.amount || draft.amount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!draft.accountId) {
      setError('Pick an account.');
      return;
    }
    if (draft.kind === 'transfer') {
      if (!draft.toAccountId) {
        setError('Pick a destination account.');
        return;
      }
      if (draft.accountId === draft.toAccountId) {
        setError('From and To accounts must differ.');
        return;
      }
    } else if (!visibleCategoryId) {
      setError('Pick a category.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await update.mutateAsync();
      else await create.mutateAsync();
      invalidateAll();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    setSaving(true);
    setError(null);
    try {
      await remove.mutateAsync();
      invalidateAll();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  const accent = KIND_TINT[draft.kind];
  const accentInk = KIND_INK[draft.kind];
  const saveLabel = isEdit ? 'Save changes' : `Save ${KIND_LABEL[draft.kind]}`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Kind toggle */}
      <div className="px-4 pt-2">
        <TxKindToggle value={draft.kind} onChange={setKind} />
      </div>

      {/* Amount hero */}
      <AmountHero
        amount={draft.amount}
        kind={draft.kind}
        onChange={(n) => setDraft((d) => ({ ...d, amount: n }))}
      />

      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="flex flex-col gap-3">
          {/* Custom amount input (visible always; the hero is a display) */}
          <TxFieldRow label="Exact amount">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={Number.isFinite(draft.amount) && draft.amount > 0 ? draft.amount : ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  amount: e.target.value === '' ? 0 : Number(e.target.value),
                }))
              }
              placeholder="0"
              className="font-mono tabular"
            />
          </TxFieldRow>

          {/* Date/time */}
          <TxFieldRow label="When">
            <Input
              type="datetime-local"
              value={utcToIsoLocal(draft.occurredAt)}
              onChange={(e) => {
                if (!e.target.value) return;
                setDraft((d) => ({ ...d, occurredAt: isoLocalToUtc(e.target.value) }));
              }}
            />
          </TxFieldRow>

          {/* From account (and To account for transfer) */}
          <TxFieldRow label={draft.kind === 'transfer' ? 'From account' : 'Account'}>
            <Select
              value={draft.accountId}
              onValueChange={(v) => setDraft((d) => ({ ...d, accountId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TxFieldRow>

          {draft.kind === 'transfer' ? (
            <TxFieldRow label="To account">
              <Select
                value={draft.toAccountId}
                onValueChange={(v) => setDraft((d) => ({ ...d, toAccountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick destination" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== draft.accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </TxFieldRow>
          ) : (
            <>
              <TxFieldRow label="Category">
                <CategoryPicker
                  categories={filteredCategories}
                  value={visibleCategoryId}
                  onChange={setCategoryId}
                />
              </TxFieldRow>

              {filteredSubs.length > 0 ? (
                <TxFieldRow label="Subcategory">
                  <Select
                    value={visibleSubcategoryId}
                    onValueChange={(v) => setDraft((d) => ({ ...d, subcategoryId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a subcategory (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TxFieldRow>
              ) : null}
            </>
          )}

          {/* Payment method */}
          {methods.length > 0 ? (
            <TxFieldRow label="Paid with">
              <Select
                value={draft.paymentMethodId}
                onValueChange={(v) => setDraft((d) => ({ ...d, paymentMethodId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TxFieldRow>
          ) : null}

          {/* Tags */}
          <TxFieldRow label="Tags">
            <TagAutocomplete
              value={draft.tagIds}
              onChange={(next) => setDraft((d) => ({ ...d, tagIds: next }))}
            />
          </TxFieldRow>

          {/* Note */}
          <TxFieldRow label="Note">
            <Input
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="Optional"
            />
          </TxFieldRow>

          {/* Balance hint */}
          {draft.accountId ? (
            <p className="text-muted-foreground px-1 text-[11px]">
              Current account balance · {fmtINR(0)} (preview-only in this build)
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          {isEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={saving}
              className="mt-2 self-start"
            >
              Delete transaction
            </Button>
          ) : null}
        </div>
      </div>

      {/* Sticky save button */}
      <div
        className="absolute inset-x-0 bottom-0 p-4 pt-2"
        style={{
          background:
            'linear-gradient(180deg, transparent, color-mix(in srgb, var(--color-background) 94%, transparent) 30%)',
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="font-display flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold tracking-tight disabled:opacity-60"
          style={{ background: accent, color: accentInk }}
        >
          <Check className="size-[18px]" strokeWidth={2.5} aria-hidden />
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
}

/** Category picker that shows the icon and tint per option. */
function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No categories for this kind yet — add one in Settings.
      </p>
    );
  }
  return (
    <div className="scrollbar-hidden flex gap-2 overflow-x-auto py-1">
      {categories.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
              on ? 'border-foreground' : 'border-border bg-card',
            )}
            style={
              on ? { background: `color-mix(in srgb, ${c.colour} 22%, transparent)` } : undefined
            }
            aria-pressed={on}
          >
            <span
              aria-hidden
              className="grid size-5 place-items-center rounded-full"
              style={{ background: c.colour, color: '#0A0908' }}
            >
              {createElement(iconByName(c.icon), {
                className: 'size-[12px]',
                strokeWidth: 1.8,
              })}
            </span>
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export type AddTransactionSheetProps = {
  /** When provided, the sheet opens in edit mode pre-filled. */
  initial?: Transaction | null;
};

export function AddTransactionSheet({ initial }: AddTransactionSheetProps) {
  const addOpen = useUiStore((s) => s.addTxOpen);
  const editingTxId = useUiStore((s) => s.editingTxId);
  const closeAdd = useUiStore((s) => s.closeAddTx);
  const setEditingTxId = useUiStore((s) => s.setEditingTxId);
  const open = addOpen || !!editingTxId;

  const { data: editing } = useQuery({
    enabled: !!editingTxId,
    queryKey: ['tx', editingTxId],
    queryFn: () => transactionsRepo.get(editingTxId!),
  });

  function handleClose() {
    closeAdd();
    setEditingTxId(null);
  }
  function handleOpenChange(next: boolean) {
    if (!next) handleClose();
  }

  const target = initial ?? editing ?? null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-hidden p-0">
        <SheetHeader className="px-4 pt-4 pb-1">
          <SheetTitle className="font-display text-base font-semibold">
            {target ? 'Edit transaction' : 'New transaction'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {target
              ? 'Adjust any field; tap save to commit.'
              : 'Capture an expense, income, or transfer.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <AddTransactionSheetBody
            key={target?.id ?? 'new'}
            initial={target}
            onClose={handleClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
