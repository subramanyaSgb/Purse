import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KIND_SOFT_BG, KIND_TINT } from './kindTint';
import type { TxKind } from '@/domain/types';

const ITEMS: Array<{ id: TxKind; label: string; Icon: typeof ArrowUpRight }> = [
  { id: 'expense', label: 'Expense', Icon: ArrowUpRight },
  { id: 'income', label: 'Income', Icon: ArrowDownLeft },
  { id: 'transfer', label: 'Transfer', Icon: ArrowLeftRight },
];

export function TxKindToggle({
  value,
  onChange,
}: {
  value: TxKind;
  onChange: (k: TxKind) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Transaction kind"
      className="bg-card border-border grid grid-cols-3 gap-1 rounded-full border p-1"
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const on = id === value;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold',
              on ? '' : 'text-muted-foreground',
            )}
            style={on ? { background: KIND_SOFT_BG[id], color: KIND_TINT[id] } : undefined}
          >
            <Icon className="size-[13px]" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
