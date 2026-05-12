import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { ManageListShell } from '@/components/ManageListShell';
import { Button } from '@/components/ui/button';
import { SubcategoryForm, type SubcategoryFormValues } from '@/components/forms/SubcategoryForm';
import { categoriesRepo } from '@/repo/categories';
import { subcategoriesRepo } from '@/repo/subcategories';
import { iconByName } from '@/components/forms/iconOptions';
import type { Subcategory } from '@/domain/types';

export default function ManageSubcategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const categoryId = id ?? '';

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => categoriesRepo.get(categoryId),
    enabled: !!categoryId,
  });

  const { data: subs = [] } = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: () => subcategoriesRepo.list({ categoryId, includeArchived: true }),
    enabled: !!categoryId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ['subcategories', categoryId] });
  }

  const create = useMutation({
    mutationFn: (v: SubcategoryFormValues) => subcategoriesRepo.create({ ...v, categoryId }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ subId, v }: { subId: string; v: SubcategoryFormValues }) =>
      subcategoriesRepo.update(subId, v),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (subId: string) => subcategoriesRepo.archive(subId),
    onSuccess: invalidate,
  });

  async function handleSave(v: SubcategoryFormValues) {
    if (editing) {
      await update.mutateAsync({ subId: editing.id, v });
    } else {
      await create.mutateAsync(v);
    }
  }
  async function handleArchive() {
    if (editing) await archive.mutateAsync(editing.id);
  }

  // Loading or missing category \xe2\x80\x94 fall back to a minimal header.
  if (catLoading) {
    return (
      <>
        <Header title="\xE2\x80\xA6" />
        <div className="p-4" />
      </>
    );
  }
  if (!category) {
    return (
      <>
        <Header
          title="Not found"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings/categories')}>
              <ArrowLeft className="mr-1 size-4" /> Back
            </Button>
          }
        />
        <p className="text-muted-foreground p-4 text-sm">That category no longer exists.</p>
      </>
    );
  }

  const sorted = [...subs].sort((a, b) => {
    const archivedDiff = Number(a.archivedAt !== null) - Number(b.archivedAt !== null);
    if (archivedDiff !== 0) return archivedDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <ManageListShell<Subcategory>
        title={category.name}
        toolbar={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings/categories')}
            className="self-start"
          >
            <ArrowLeft className="mr-1 size-4" /> All categories
          </Button>
        }
        items={sorted}
        getKey={(s) => s.id}
        matchesSearch={(s, q) => s.name.toLowerCase().includes(q.toLowerCase())}
        searchPlaceholder="Search subcategories"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        addLabel="Add subcategory"
        onEdit={(s) => {
          setEditing(s);
          setOpen(true);
        }}
        emptyMessage="No subcategories yet. Tap + to add one."
        renderItem={(s) => {
          const Icon = iconByName(s.icon);
          const archived = s.archivedAt !== null;
          return (
            <div className="flex w-full items-center gap-3">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full"
                style={{ backgroundColor: category.colour, color: '#fff' }}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate font-medium">{s.name}</span>
                  {archived ? (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] uppercase">
                      Archived
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        }}
      />
      <SubcategoryForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        parentIcon={category.icon}
        onSave={handleSave}
        onArchive={editing && editing.archivedAt === null ? handleArchive : undefined}
      />
    </>
  );
}
