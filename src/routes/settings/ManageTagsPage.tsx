import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ManageListShell } from '@/components/ManageListShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
      <div className="grid gap-2">
        <Label htmlFor="tag-name">Name</Label>
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. reimburse-pending"
          autoFocus
          required
        />
        {isEdit && initial ? (
          <p className="text-muted-foreground text-xs">
            Used {initial.usageCount} time{initial.usageCount === 1 ? '' : 's'}.
            {onRemove ? '' : ' Tags already on transactions can be renamed but not deleted.'}
          </p>
        ) : null}
      </div>

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
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
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
              className="bg-muted text-muted-foreground inline-flex h-6 items-center rounded-full px-2 text-xs font-medium"
            >
              #{t.name}
            </span>
            <div className="text-muted-foreground ml-auto text-xs">
              {t.usageCount === 0
                ? 'unused'
                : `${t.usageCount} use${t.usageCount === 1 ? '' : 's'}`}
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
