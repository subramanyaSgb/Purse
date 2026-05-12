import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ManageListShell } from '@/components/ManageListShell';
import { AccountForm, type AccountFormValues } from '@/components/forms/AccountForm';
import { Button } from '@/components/ui/button';
import { accountsRepo } from '@/repo/accounts';
import { appMetaRepo } from '@/repo/appMeta';
import { BALANCES_QUERY_KEY } from '@/state/useBalances';
import { iconByName } from '@/components/forms/iconOptions';
import { moveInOrder, sortByOrder } from '@/lib/order';
import type { Account } from '@/domain/types';

const ACCOUNTS_QUERY_KEY = ['accounts'] as const;
const APP_META_QUERY_KEY = ['appMeta'] as const;

export default function ManageAccountsPage() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => accountsRepo.list({ includeArchived: true }),
  });
  const { data: appMeta } = useQuery({
    queryKey: APP_META_QUERY_KEY,
    queryFn: () => appMetaRepo.get(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY });
  }
  function invalidateAppMeta() {
    void qc.invalidateQueries({ queryKey: APP_META_QUERY_KEY });
  }

  const create = useMutation({
    mutationFn: (v: AccountFormValues) => accountsRepo.create(v),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, v }: { id: string; v: AccountFormValues }) => accountsRepo.update(id, v),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => accountsRepo.archive(id),
    onSuccess: invalidate,
  });
  // remove() throws "Account has transactions; archive instead" when the
  // row is still referenced — the form surfaces that error inline so the
  // user understands why and falls back to Archive.
  const remove = useMutation({
    mutationFn: (id: string) => accountsRepo.remove(id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (accountOrder: string[]) => appMetaRepo.update({ accountOrder }),
    onSuccess: invalidateAppMeta,
  });

  function handleAdd() {
    setEditing(null);
    setOpen(true);
  }
  function handleEdit(a: Account) {
    setEditing(a);
    setOpen(true);
  }
  async function handleSave(v: AccountFormValues) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, v });
    } else {
      await create.mutateAsync(v);
    }
  }
  async function handleArchive() {
    if (editing) await archive.mutateAsync(editing.id);
  }
  async function handleRemove() {
    if (editing) await remove.mutateAsync(editing.id);
  }

  // Display order: respect user-defined accountOrder for active rows,
  // alphabetical fallback for the rest, then archived rows at the tail.
  const active = accounts.filter((a) => a.archivedAt === null);
  const archived = accounts.filter((a) => a.archivedAt !== null);
  const activeOrdered = sortByOrder(active, appMeta?.accountOrder);
  const archivedSorted = [...archived].sort((a, b) => a.name.localeCompare(b.name));
  const sorted: Account[] = [...activeOrdered, ...archivedSorted];

  // Index of each active row within the active-only list — used to
  // disable up on the first row and down on the last so users don't
  // see no-op chrome.
  const activeIdToIndex = new Map(activeOrdered.map((a, i) => [a.id, i]));
  const activeCount = activeOrdered.length;

  async function moveAccount(id: string, delta: -1 | 1) {
    const idx = activeIdToIndex.get(id);
    if (idx === undefined) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= activeCount) return;
    // Seed the order with the current effective active order so newly-
    // created accounts (which weren't yet in accountOrder) are pinned in
    // their alphabetical slot on first move.
    const seed = activeOrdered.map((a) => a.id);
    const next = moveInOrder(seed, id, targetIdx);
    await reorder.mutateAsync(next);
  }

  return (
    <>
      <ManageListShell<Account>
        title="Manage accounts"
        items={sorted}
        getKey={(a) => a.id}
        matchesSearch={(a, q) => a.name.toLowerCase().includes(q.toLowerCase())}
        searchPlaceholder="Search accounts"
        onAdd={handleAdd}
        addLabel="Add account"
        emptyMessage="No accounts yet. Tap + to add one."
        renderItem={(a) => {
          const Icon = iconByName(a.icon);
          const archivedRow = a.archivedAt !== null;
          const idx = activeIdToIndex.get(a.id);
          const canMoveUp = !archivedRow && idx !== undefined && idx > 0;
          const canMoveDown = !archivedRow && idx !== undefined && idx < activeCount - 1;
          return (
            <div className="flex w-full items-center">
              <button
                type="button"
                onClick={() => handleEdit(a)}
                className="hover:bg-accent focus-visible:ring-ring flex flex-1 cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`Edit ${a.name}`}
              >
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-2xl"
                  style={{ backgroundColor: a.colour, color: '#fff' }}
                >
                  <Icon className="size-4.5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-foreground truncate text-[15px] font-semibold">
                      {a.name}
                    </span>
                    {archivedRow ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                        style={{
                          background: 'var(--color-elevation-subtle)',
                          color: 'var(--color-ink-faint)',
                        }}
                      >
                        Archived
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mt-0.5 text-xs capitalize"
                    style={{ color: 'var(--color-ink-faint)' }}
                  >
                    {a.type}
                    {a.bankName ? ` · ${a.bankName}` : ''}
                  </div>
                </div>
                <div
                  className="font-mono text-[11px] tracking-wider uppercase"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  {a.currency}
                </div>
              </button>
              {/* Reorder controls — only shown for active rows. Archived
                  rows can't be moved (they're sorted to the tail). */}
              {archivedRow ? null : (
                <div className="flex flex-col gap-0.5 pr-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${a.name} up`}
                    disabled={!canMoveUp || reorder.isPending}
                    onClick={() => void moveAccount(a.id, -1)}
                    className="size-7 cursor-pointer rounded-lg disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${a.name} down`}
                    disabled={!canMoveDown || reorder.isPending}
                    onClick={() => void moveAccount(a.id, 1)}
                    className="size-7 cursor-pointer rounded-lg disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        }}
      />
      <AccountForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSave={handleSave}
        onArchive={editing && editing.archivedAt === null ? handleArchive : undefined}
        onRemove={editing ? handleRemove : undefined}
      />
    </>
  );
}
