import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ManageListShell } from '@/components/ManageListShell';
import { AccountForm, type AccountFormValues } from '@/components/forms/AccountForm';
import { accountsRepo } from '@/repo/accounts';
import { BALANCES_QUERY_KEY } from '@/state/useBalances';
import { iconByName } from '@/components/forms/iconOptions';
import type { Account } from '@/domain/types';

const ACCOUNTS_QUERY_KEY = ['accounts'] as const;

export default function ManageAccountsPage() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => accountsRepo.list({ includeArchived: true }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    void qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY });
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

  // Sort: active first by name; archived go below.
  const sorted = [...accounts].sort((a, b) => {
    const archivedDiff = Number(a.archivedAt !== null) - Number(b.archivedAt !== null);
    if (archivedDiff !== 0) return archivedDiff;
    return a.name.localeCompare(b.name);
  });

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
        onEdit={handleEdit}
        emptyMessage="No accounts yet. Tap + to add one."
        renderItem={(a) => {
          const Icon = iconByName(a.icon);
          const archived = a.archivedAt !== null;
          return (
            <div className="flex w-full items-center gap-3">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full"
                style={{ backgroundColor: a.colour, color: '#fff' }}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate font-medium">{a.name}</span>
                  {archived ? (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] uppercase">
                      Archived
                    </span>
                  ) : null}
                </div>
                <div className="text-muted-foreground text-xs capitalize">
                  {a.type}
                  {a.bankName ? ` · ${a.bankName}` : ''}
                </div>
              </div>
              <div className="text-muted-foreground text-xs">{a.currency}</div>
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
      />
    </>
  );
}
