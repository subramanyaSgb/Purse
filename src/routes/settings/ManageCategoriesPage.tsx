import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, MoreVertical, Pencil } from 'lucide-react';
import { ManageListShell } from '@/components/ManageListShell';
import { CategoryForm, type CategoryFormValues } from '@/components/forms/CategoryForm';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { categoriesRepo } from '@/repo/categories';
import { iconByName } from '@/components/forms/iconOptions';
import { cn } from '@/lib/utils';
import type { Category, CategoryKind } from '@/domain/types';

const CATEGORIES_QUERY_KEY = ['categories'] as const;

export default function ManageCategoriesPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => categoriesRepo.list({ includeArchived: true }),
  });

  function invalidate() {
    void qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  }

  const create = useMutation({
    mutationFn: (v: CategoryFormValues) => categoriesRepo.create(v),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, v }: { id: string; v: CategoryFormValues }) => categoriesRepo.update(id, v),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => categoriesRepo.archive(id),
    onSuccess: invalidate,
  });

  async function handleSave(v: CategoryFormValues) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, v });
    } else {
      await create.mutateAsync(v);
    }
  }
  async function handleArchive() {
    if (editing) await archive.mutateAsync(editing.id);
  }

  const filteredByKind = categories.filter((c) => c.kind === kind);
  const sorted = [...filteredByKind].sort((a, b) => {
    const archivedDiff = Number(a.archivedAt !== null) - Number(b.archivedAt !== null);
    if (archivedDiff !== 0) return archivedDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <ManageListShell<Category>
        title="Manage categories"
        toolbar={
          <div
            role="tablist"
            aria-label="Kind"
            className="border-border flex gap-1 rounded-full border p-1"
            style={{ background: 'var(--color-elevation-subtle)' }}
          >
            {(['expense', 'income'] as const).map((k) => (
              <Button
                key={k}
                role="tab"
                aria-selected={kind === k}
                type="button"
                size="sm"
                variant={kind === k ? 'default' : 'ghost'}
                onClick={() => setKind(k)}
                className={cn(
                  'flex-1 cursor-pointer rounded-full',
                  kind === k ? '' : 'hover:bg-background',
                )}
              >
                {k === 'expense' ? 'Expense' : 'Income'}
              </Button>
            ))}
          </div>
        }
        items={sorted}
        getKey={(c) => c.id}
        matchesSearch={(c, q) => c.name.toLowerCase().includes(q.toLowerCase())}
        searchPlaceholder="Search categories"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        addLabel="Add category"
        emptyMessage="No categories yet. Tap + to add one."
        renderItem={(c) => {
          const Icon = iconByName(c.icon);
          const archived = c.archivedAt !== null;
          return (
            <div className="flex items-center">
              <Link
                to={`/settings/categories/${c.id}`}
                className="hover:bg-accent focus-visible:ring-ring flex flex-1 cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`Subcategories of ${c.name}`}
              >
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-2xl"
                  style={{ backgroundColor: c.colour, color: '#fff' }}
                >
                  <Icon className="size-4.5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-foreground truncate text-[15px] font-semibold">
                      {c.name}
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
                    className="mt-0.5 text-xs"
                    style={{ color: 'var(--color-ink-faint)' }}
                  >
                    Tap to manage subcategories
                  </div>
                </div>
                <ChevronRight className="size-4" style={{ color: 'var(--color-ink-faint)' }} aria-hidden />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${c.name}`}
                    className="mr-2 cursor-pointer rounded-xl"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" /> Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }}
      />
      <CategoryForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        defaultKind={kind}
        onSave={handleSave}
        onArchive={editing && editing.archivedAt === null ? handleArchive : undefined}
      />
    </>
  );
}
