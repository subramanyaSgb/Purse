import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ManageListShell } from '@/components/ManageListShell';
import {
  PaymentMethodForm,
  type PaymentMethodFormValues,
} from '@/components/forms/PaymentMethodForm';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { iconByName } from '@/components/forms/iconOptions';
import type { PaymentMethod } from '@/domain/types';

const PMS_QUERY_KEY = ['paymentMethods'] as const;

export default function ManagePaymentMethodsPage() {
  const qc = useQueryClient();
  const { data: pms = [] } = useQuery({
    queryKey: PMS_QUERY_KEY,
    queryFn: () => paymentMethodsRepo.list({ includeArchived: true }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: PMS_QUERY_KEY });
  }

  const create = useMutation({
    mutationFn: (v: PaymentMethodFormValues) => paymentMethodsRepo.create(v),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, v }: { id: string; v: PaymentMethodFormValues }) =>
      paymentMethodsRepo.update(id, v),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => paymentMethodsRepo.archive(id),
    onSuccess: invalidate,
  });

  async function handleSave(v: PaymentMethodFormValues) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, v });
    } else {
      await create.mutateAsync(v);
    }
  }
  async function handleArchive() {
    if (editing) await archive.mutateAsync(editing.id);
  }

  const sorted = [...pms].sort((a, b) => {
    const archivedDiff = Number(a.archivedAt !== null) - Number(b.archivedAt !== null);
    if (archivedDiff !== 0) return archivedDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <ManageListShell<PaymentMethod>
        title="Payment methods"
        items={sorted}
        getKey={(p) => p.id}
        matchesSearch={(p, q) => p.name.toLowerCase().includes(q.toLowerCase())}
        searchPlaceholder="Search payment methods"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        addLabel="Add payment method"
        onEdit={(p) => {
          setEditing(p);
          setOpen(true);
        }}
        emptyMessage="No payment methods yet. Tap + to add one."
        renderItem={(p) => {
          const Icon = iconByName(p.icon);
          const archived = p.archivedAt !== null;
          return (
            <div className="flex w-full items-center gap-3">
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-2xl"
                style={{ backgroundColor: p.colour, color: '#fff' }}
              >
                <Icon className="size-4.5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-foreground truncate text-[15px] font-semibold">
                    {p.name}
                  </span>
                  {archived ? (
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
                  className="mt-0.5 text-xs tracking-wider uppercase"
                  style={{ color: 'var(--color-ink-faint)' }}
                >
                  {p.kind === 'upi' ? 'UPI' : p.kind}
                </div>
              </div>
            </div>
          );
        }}
      />
      <PaymentMethodForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSave={handleSave}
        onArchive={editing && editing.archivedAt === null ? handleArchive : undefined}
      />
    </>
  );
}
