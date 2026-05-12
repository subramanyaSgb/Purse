import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { ManageListShell } from '@/components/ManageListShell';
import { PlaceForm, type PlaceFormValues } from '@/components/forms/PlaceForm';
import { placesRepo } from '@/repo/places';
import type { Place } from '@/domain/types';

const PLACES_QUERY_KEY = ['places'] as const;

export default function ManagePlacesPage() {
  const qc = useQueryClient();
  const { data: places = [] } = useQuery({
    queryKey: PLACES_QUERY_KEY,
    queryFn: () => placesRepo.list(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: PLACES_QUERY_KEY });
  }

  const create = useMutation({
    mutationFn: (v: PlaceFormValues) => placesRepo.create(v),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, v }: { id: string; v: PlaceFormValues }) => placesRepo.update(id, v),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => placesRepo.remove(id),
    onSuccess: invalidate,
  });

  async function handleSave(v: PlaceFormValues) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, v });
    } else {
      await create.mutateAsync(v);
    }
  }
  async function handleRemove() {
    if (editing) await remove.mutateAsync(editing.id);
  }

  return (
    <>
      <ManageListShell<Place>
        title="Manage places"
        items={places}
        getKey={(p) => p.id}
        matchesSearch={(p, q) => p.name.toLowerCase().includes(q.toLowerCase())}
        searchPlaceholder="Search places"
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        addLabel="Add place"
        onEdit={(p) => {
          setEditing(p);
          setOpen(true);
        }}
        emptyMessage="No places yet. Tap + to add Home, Office, etc."
        renderItem={(p) => (
          <div className="flex w-full items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-2xl"
              style={{
                background: 'rgba(255,179,71,0.16)',
                color: 'var(--color-warn)',
              }}
            >
              <MapPin className="size-4.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-[15px] font-semibold">{p.name}</div>
              <div
                className="font-mono mt-0.5 truncate text-[11px]"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                {p.addressCached ?? `${p.lat.toFixed(5)}°N · ${p.lng.toFixed(5)}°E`}
              </div>
            </div>
            {p.lastUsedAt ? null : (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                style={{
                  background: 'var(--color-elevation-subtle)',
                  color: 'var(--color-ink-faint)',
                }}
              >
                Unused
              </span>
            )}
          </div>
        )}
      />
      <PlaceForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSave={handleSave}
        onRemove={editing ? handleRemove : undefined}
      />
    </>
  );
}
