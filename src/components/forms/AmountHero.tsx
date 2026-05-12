import { KIND_TINT } from './kindTint';
import { fmtINR } from '@/lib/format';
import type { TxKind } from '@/domain/types';

const QUICK_ADDS = [100, 500, 1000, 2500];

/**
 * The big tabular amount display at the top of Add/Edit transaction.
 * Renders the amount in the kind's accent colour with quick-add chips
 * underneath. Quick-add chips ADD to the current amount (not replace) —
 * matches the "+₹100" affordance from the design.
 */
export function AmountHero({
  amount,
  kind,
  onChange,
}: {
  amount: number;
  kind: TxKind;
  onChange: (next: number) => void;
}) {
  const tint = KIND_TINT[kind];
  const displayValue =
    Number.isFinite(amount) && amount > 0 ? fmtINR(amount).replace('₹', '') : '0';

  return (
    <div className="px-6 py-6 text-center">
      <div
        className="text-[11px] font-semibold tracking-widest uppercase"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        Amount · INR
      </div>
      <div
        className="font-display tabular mt-1.5 flex items-baseline justify-center gap-1 text-5xl leading-none font-bold tracking-tight"
        style={{ color: tint }}
      >
        <span className="text-muted-foreground text-2xl">₹</span>
        <span>{displayValue}</span>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_ADDS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onChange((amount || 0) + q)}
            className="bg-card border-border text-muted-foreground hover:text-foreground rounded-full border px-3 py-1.5 font-mono text-[11.5px] font-semibold"
          >
            +{q}
          </button>
        ))}
        {amount > 0 ? (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
