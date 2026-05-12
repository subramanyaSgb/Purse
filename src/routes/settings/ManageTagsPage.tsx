import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Trash2 } from 'lucide-react';
import { ManageListShell } from '@/components/ManageListShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TxFieldRow } from '@/components/forms/TxFieldRow';
import { tagsRepo } from '@/repo/tags';
import type { Tag } from '@/domain/types';

const TAGS_QUERY_KEY = ['tags'] as const;

function TagFormBody({
  initial,
  onSave,
  onRemove,
  onClose,
}: {
  initial: Tag | null;
  onSave: (name: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-6">
      {/* Preview tile — uses a soft warn-tone background to differentiate
          tags from the categories/payment-methods which carry colour. */}
      <div className="flex items-center gap-3 pt-2">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-2xl"
          style={{
            background: 'var(--color-elevation-subtle)',
            color: 'var(--color-foreground)',
          }}
        >
          <Hash className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-base font-semibold">
            #{name.trim() || 'new-tag'}
          </div>
          {isEdit && initial ? (
            <div
              className="mt-0.5 text-xs"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Used {initial.usageCount} time{initial.usageCount === 1 ? '' : 's'}
              {onRemove ? '' : ' — rename only'}
            </div>
          ) : (
            <div
              className="mt-0.5 text-xs"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Cross-cutting label across transactions
            </div>
          )}
        </div>
      </div>

      <TxFieldRow label="Name">
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. reimburse-pending"
          autoFocus
          required
        />
      </TxFieldRow>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <SheetFooter className="flex-col gap-2 sm:flex-row">
        {isEdit && onRemove ? (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onRemove();
              onClose();
            }}
            disabled={saving}
            className="cursor-pointer gap-2"
            style={{
              background: 'rgba(255,136,102,0.10)',
              borderColor: 'rgba(255,136,102,0.3)',
              color: 'var(--color-expense)',
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : null}
        <Button type="submit" disabled={saving} className="cursor-pointer">
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create tag'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export default function ManageTagsPage() {
  const qc = useQueryClient();
  const { data: tags = [] } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: () => tagsRepo.list(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
  }

  const create = useMutation({
    mutationFn: (name: string) => tagsRepo.create({ name }),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsRepo.rename(id, name),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => tagsRepo.remove(id),
    onSuccess: invalidate,
  });

  async function handleSave(name: string) {
    if (editing) {
      await rename.mutateAsync({ id: editing.id, name });
    } else {
      await create.mutateAsync(name);
    }
  }
  async function handleRemove() {
    if (editing) await remove.mutateAsync(editing.id);
  }

  return (
    <>
      <ManageListShell<Tag>
        title="Manage tags"
        items={tags}
        getKey={(t) => t.id}
        matchesSearch={(t, q) => t.nameLower.includes(q.toLowerCase())}
        searchPlaceholder="Search tags"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        addLabel="Add tag"
        onEdit={(t) => {
          setEditing(t);
          setOpen(true);
        }}
        emptyMessage="No tags yet. Add one or tag a transaction to start."
        renderItem={(t) => (
          <div className="flex w-full items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-2xl"
              style={{
                background: 'var(--color-elevation-subtle)',
                color: 'var(--color-foreground)',
              }}
            >
              <Hash className="size-4.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-[15px] font-semibold">
                #{t.name}
              </div>
              <div
                className="mt-0.5 text-xs"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                {t.usageCount === 0
                  ? 'unused'
                  : `${t.usageCount} use${t.usageCount === 1 ? '' : 's'}`}
              </div>
            </div>
          </div>
        )}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit tag' : 'New tag'}</SheetTitle>
            <SheetDescription>
              {editing
                ? 'Rename this tag. Deletion is only allowed for unused tags.'
                : 'Tags are cross-cutting labels applied across many transactions.'}
            </SheetDescription>
          </SheetHeader>
          {open ? (
            <TagFormBody
              key={editing?.id ?? 'new'}
              initial={editing}
              onSave={handleSave}
              onRemove={editing && editing.usageCount === 0 ? handleRemove : undefined}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
