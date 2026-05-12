import { cn } from '@/lib/utils';
import { DEFAULT_RANGE_CHIPS, type DateRangeChip } from './dateRangeChipsOptions';
import type { RangePreset } from '@/state/uiStore';

/** Horizontal scroll of range presets — selected chip uses the lime accent. */
export function DateRangeChips({
  value,
  onChange,
  chips = DEFAULT_RANGE_CHIPS,
  className,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
  chips?: DateRangeChip[];
  className?: string;
}) {
  return (
    <div className={cn('scrollbar-hidden flex gap-2 overflow-x-auto', className)}>
      {chips.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
              on
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border-border text-foreground border',
            )}
            aria-pressed={on}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
