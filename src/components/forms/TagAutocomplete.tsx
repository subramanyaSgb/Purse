import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { tagsRepo } from '@/repo/tags';

/**
 * Multi-tag autocomplete.
 *
 * - Type to filter the existing tag list (sorted by usage desc).
 * - Enter or comma commits the current input as a chip: if a tag with
 *   matching nameLower exists, its id is added; otherwise a new tag is
 *   created via tagsRepo.findOrCreate (also bumps usageCount).
 * - Backspace on empty input removes the most recent chip.
 * - Selected chips appear above the input; tap × on a chip to remove.
 */
export function TagAutocomplete({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const qc = useQueryClient();
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsRepo.list(),
  });
  const findOrCreate = useMutation({
    mutationFn: (name: string) => tagsRepo.findOrCreate(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const [input, setInput] = useState('');
  const selectedIds = useMemo(() => new Set(value), [value]);

  const matches = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return allTags.filter((t) => !selectedIds.has(t.id)).slice(0, 5);
    return allTags.filter((t) => !selectedIds.has(t.id) && t.nameLower.includes(q)).slice(0, 5);
  }, [allTags, input, selectedIds]);

  const exactMatch = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return null;
    return allTags.find((t) => t.nameLower === q) ?? null;
  }, [allTags, input]);

  async function commit(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const tag = await findOrCreate.mutateAsync(trimmed);
      if (!value.includes(tag.id)) onChange([...value, tag.id]);
      setInput('');
    } catch {
      // tagsRepo.findOrCreate doesn't typically throw, but guard anyway.
    }
  }

  function addExistingById(id: string) {
    if (value.includes(id)) return;
    onChange([...value, id]);
    setInput('');
  }

  function removeById(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      // If there's an exact match, reuse that tag instead of creating.
      if (exactMatch) {
        addExistingById(exactMatch.id);
      } else if (input.trim()) {
        void commit(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-2">
      {/* Selected chips */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const tag = allTags.find((t) => t.id === id);
            if (!tag) return null;
            return (
              <span
                key={id}
                className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              >
                #{tag.name}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag.name}`}
                  onClick={() => removeById(id)}
                  className="hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length ? 'Add another…' : 'Type a tag, press Enter'}
        aria-label="Add tag"
        className="bg-transparent text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
      />

      {/* Suggestion strip */}
      {matches.length > 0 || (input.trim() && !exactMatch) ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {matches.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => addExistingById(t.id)}
              className="bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            >
              #{t.name}
              {t.usageCount > 0 ? (
                <span className="font-mono opacity-60">{t.usageCount}</span>
              ) : null}
            </button>
          ))}
          {input.trim() && !exactMatch ? (
            <button
              type="button"
              onClick={() => commit(input)}
              className="text-foreground border-border inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-semibold"
            >
              <Plus className="size-3" aria-hidden /> Create "{input.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
