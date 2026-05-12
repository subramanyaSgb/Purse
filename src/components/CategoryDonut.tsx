import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsRepo } from '@/repo/transactions';
import { categoriesRepo } from '@/repo/categories';
import { fmtINR } from '@/lib/format';

/**
 * Top-N spend-by-category donut for the current IST month.
 *
 * Renders SVG arcs directly (no recharts dependency) — keeps bundle
 * cost low and matches the design's compact card exactly. Top 5
 * categories shown in the legend; the remainder fold into 'Others'.
 */
const CX = 80;
const CY = 80;
const R_OUTER = 64;
const R_INNER = 44;

type Slice = {
  id: string;
  name: string;
  total: number;
  tint: string;
};

function buildArcPath(slice: Slice, cumulative: number, total: number): string {
  const start = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
  const end = ((cumulative + slice.total) / total) * Math.PI * 2 - Math.PI / 2;
  const large = end - start > Math.PI ? 1 : 0;
  const sx = CX + R_OUTER * Math.cos(start);
  const sy = CY + R_OUTER * Math.sin(start);
  const ex = CX + R_OUTER * Math.cos(end);
  const ey = CY + R_OUTER * Math.sin(end);
  const ixEnd = CX + R_INNER * Math.cos(end);
  const iyEnd = CY + R_INNER * Math.sin(end);
  const ixStart = CX + R_INNER * Math.cos(start);
  const iyStart = CY + R_INNER * Math.sin(start);
  return `M ${sx} ${sy} A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${ex} ${ey} L ${ixEnd} ${iyEnd} A ${R_INNER} ${R_INNER} 0 ${large} 0 ${ixStart} ${iyStart} Z`;
}

function monthISOForNow(): string {
  const d = new Date();
  // Use the IST month boundary by reading the IST local year/month from a
  // shifted Date. monthlyTotalsByCategory itself handles the bound math; we
  // only need a 'YYYY-MM' string here.
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function CategoryDonut() {
  const monthISO = useMemo(() => monthISOForNow(), []);
  const { data: totals = [] } = useQuery({
    queryKey: ['monthly-totals', monthISO],
    queryFn: () => transactionsRepo.monthlyTotalsByCategory(monthISO),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesRepo.list({ includeArchived: true }),
  });

  // monthlyTotalsByCategory mixes income + expense (excludes transfers).
  // The Dashboard donut is about *spending*, so keep only expense categories.
  const expenseCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.kind === 'expense').map((c) => c.id)),
    [categories],
  );

  const slices: Slice[] = useMemo(() => {
    const filtered = totals.filter((t) => expenseCategoryIds.has(t.categoryId));
    return filtered
      .map((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        return {
          id: t.categoryId,
          name: cat?.name ?? 'Unknown',
          total: t.total,
          tint: cat?.colour ?? 'var(--color-muted)',
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [totals, categories, expenseCategoryIds]);

  const grandTotal = slices.reduce((s, x) => s + x.total, 0);

  if (slices.length === 0 || grandTotal === 0) {
    return (
      <div className="bg-card border-border mx-4 rounded-2xl border p-5">
        <p role="status" className="text-muted-foreground text-center text-sm">
          No expenses this month yet. Once you log a few, the breakdown shows up here.
        </p>
      </div>
    );
  }

  // Fold tail into 'Others'.
  const top = slices.slice(0, 5);
  const tail = slices.slice(5);
  const tailTotal = tail.reduce((s, x) => s + x.total, 0);
  const renderSlices: Slice[] = tailTotal
    ? [...top, { id: '__others__', name: 'Others', total: tailTotal, tint: 'var(--color-muted)' }]
    : top;

  const arcs = renderSlices.reduce<Array<Slice & { path: string }>>((acc, s) => {
    const cumulative = acc.reduce((sum, a) => sum + a.total, 0);
    acc.push({ ...s, path: buildArcPath(s, cumulative, grandTotal) });
    return acc;
  }, []);

  return (
    <div className="bg-card border-border mx-4 rounded-2xl border p-5">
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative size-[160px] shrink-0">
          <svg viewBox="0 0 160 160" width="160" height="160">
            {arcs.map((a) => (
              <path key={a.id} d={a.path} fill={a.tint} />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[10.5px] font-semibold tracking-wider uppercase"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              Spent
            </span>
            <span className="font-display tabular text-xl font-bold tracking-tight">
              {fmtINR(grandTotal)}
            </span>
          </div>
        </div>

        {/* Legend — top 5 + Others */}
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {arcs.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: a.tint }}
              />
              <span className="text-foreground min-w-0 flex-1 truncate text-xs">{a.name}</span>
              <span
                className="font-mono tabular text-[11px]"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {Math.round((a.total / grandTotal) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
