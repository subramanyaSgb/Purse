import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ManageListShellProps<T> = {
  /** Page title for the shared Header. */
  title: string;
  /** Optional toolbar (e.g., kind toggle) rendered under the header. */
  toolbar?: React.ReactNode;
  /** Items to display. */
  items: T[];
  /** Unique key per row \xe2\x80\x94 stable React key. */
  getKey: (item: T) => string;
  /** Render the row content. The shell wraps it in a clickable container. */
  renderItem: (item: T) => React.ReactNode;
  /** Filter predicate for the search input. Omit to disable search. */
  matchesSearch?: (item: T, q: string) => boolean;
  searchPlaceholder?: string;
  /** Triggered by the floating Add button. */
  onAdd: () => void;
  addLabel?: string;
  /** Triggered by tapping any row. */
  onEdit?: (item: T) => void;
  /** Optional message when the (filtered) list is empty. */
  emptyMessage?: string;
};

/**
 * Reusable scaffold for every "Manage X" screen in Settings. Includes a
 * standard Header, an optional toolbar slot, an optional search input,
 * a tap-to-edit list, an empty state, and a floating Add button that
 * sits above the bottom tab bar.
 */
export function ManageListShell<T>({
  title,
  toolbar,
  items,
  getKey,
  renderItem,
  matchesSearch,
  searchPlaceholder = 'Search',
  onAdd,
  addLabel = 'Add',
  onEdit,
  emptyMessage = 'Nothing here yet.',
}: ManageListShellProps<T>) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!matchesSearch || !query.trim()) return items;
    const q = query.trim();
    return items.filter((it) => matchesSearch(it, q));
  }, [items, query, matchesSearch]);

  return (
    <>
      <Header title={title} />
      <div className="flex flex-col gap-3 p-4 pb-24">
        {toolbar ? <div>{toolbar}</div> : null}
        {matchesSearch ? (
          <div className="relative">
            <Search
              aria-hidden
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p
            role="status"
            className="text-muted-foreground border-border rounded-2xl border border-dashed py-12 text-center text-sm"
          >
            {emptyMessage}
          </p>
        ) : (
          <ul className="bg-card border-border overflow-hidden rounded-2xl border">
            {filtered.map((item, i) => {
              const key = getKey(item);
              const content = renderItem(item);
              const rowBorder = i === 0 ? '' : 'border-border/60 border-t';
              if (!onEdit) {
                // No row-level click handler \xe2\x80\x94 renderItem owns the interior
                // padding and interactive elements.
                return (
                  <li key={key} className={rowBorder}>
                    {content}
                  </li>
                );
              }
              return (
                <li key={key} className={rowBorder}>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className={cn(
                      'hover:bg-accent focus-visible:ring-ring flex w-full cursor-pointer items-center px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    )}
                  >
                    {content}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button
        onClick={onAdd}
        size="icon"
        aria-label={addLabel}
        className="fixed right-4 bottom-20 size-14 cursor-pointer rounded-full shadow-lg"
      >
        <Plus className="size-5" />
      </Button>
    </>
  );
}
