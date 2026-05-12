import { cn } from '@/lib/utils';

export function TxFieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: 'var(--color-ink-faint)' }}
        >
          {label}
        </span>
        {hint ? (
          <span className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
            · {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** A surface chip the value is rendered inside — matches the design's FieldChip. */
export function TxFieldChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card border-border flex items-center gap-2.5 rounded-xl border px-3 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  );
}
