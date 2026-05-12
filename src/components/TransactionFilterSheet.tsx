import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { accountsRepo } from '@/repo/accounts';
import { categoriesRepo } from '@/repo/categories';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { tagsRepo } from '@/repo/tags';
import { activeFilterCount, EMPTY_FILTERS, type ActivityFilters } from './activityFilters';
import type { TxKind } from '@/domain/types';

function FilterBody({
  initial,
  onApply,
  onClose,
}: {
  initial: ActivityFilters;
  onApply: (next: ActivityFilters) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<ActivityFilters>(initial);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsRepo.list({ includeArchived: true }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesRepo.list({ includeArchived: true }),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsRepo.list({ includeArchived: true }),
  });
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsRepo.list(),
  });

  function toggleId(key: keyof Omit<ActivityFilters, 'kinds'>, id: string, on: boolean) {
    setValues((v) => {
      const set = new Set(v[key]);
      if (on) set.add(id);
      else set.delete(id);
      return { ...v, [key]: Array.from(set) };
    });
  }
  function toggleKind(k: TxKind, on: boolean) {
    setValues((v) => {
      const set = new Set(v.kinds);
      if (on) set.add(k);
      else set.delete(k);
      return { ...v, kinds: Array.from(set) };
    });
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      <FilterSection title="Kind">
        {(['expense', 'income', 'transfer'] as const).map((k) => (
          <Label
            key={k}
            htmlFor={`filter-kind-${k}`}
            className="flex items-center gap-3 py-1.5 font-normal capitalize"
          >
            <Checkbox
              id={`filter-kind-${k}`}
              checked={values.kinds.includes(k)}
              onCheckedChange={(c) => toggleKind(k, c === true)}
            />
            {k}
          </Label>
        ))}
      </FilterSection>

      <FilterSection title="Account">
        {accounts.length === 0 ? (
          <Empty>No accounts yet.</Empty>
        ) : (
          accounts.map((a) => (
            <Label
              key={a.id}
              htmlFor={`filter-acc-${a.id}`}
              className="flex items-center gap-3 py-1.5 font-normal"
            >
              <Checkbox
                id={`filter-acc-${a.id}`}
                checked={values.accountIds.includes(a.id)}
                onCheckedChange={(c) => toggleId('accountIds', a.id, c === true)}
              />
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: a.colour }}
              />
              {a.name}
            </Label>
          ))
        )}
      </FilterSection>

      <FilterSection title="Category">
        {categories.length === 0 ? (
          <Empty>No categories yet.</Empty>
        ) : (
          categories.map((c) => (
            <Label
              key={c.id}
              htmlFor={`filter-cat-${c.id}`}
              className="flex items-center gap-3 py-1.5 font-normal"
            >
              <Checkbox
                id={`filter-cat-${c.id}`}
                checked={values.categoryIds.includes(c.id)}
                onCheckedChange={(on) => toggleId('categoryIds', c.id, on === true)}
              />
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: c.colour }}
              />
              {c.name}
            </Label>
          ))
        )}
      </FilterSection>

      <FilterSection title="Payment method">
        {methods.length === 0 ? (
          <Empty>No payment methods yet.</Empty>
        ) : (
          methods.map((m) => (
            <Label
              key={m.id}
              htmlFor={`filter-pm-${m.id}`}
              className="flex items-center gap-3 py-1.5 font-normal"
            >
              <Checkbox
                id={`filter-pm-${m.id}`}
                checked={values.paymentMethodIds.includes(m.id)}
                onCheckedChange={(on) => toggleId('paymentMethodIds', m.id, on === true)}
              />
              {m.name}
            </Label>
          ))
        )}
      </FilterSection>

      <FilterSection title="Tag">
        {tags.length === 0 ? (
          <Empty>No tags yet.</Empty>
        ) : (
          tags.map((t) => (
            <Label
              key={t.id}
              htmlFor={`filter-tag-${t.id}`}
              className="flex items-center gap-3 py-1.5 font-normal"
            >
              <Checkbox
                id={`filter-tag-${t.id}`}
                checked={values.tagIds.includes(t.id)}
                onCheckedChange={(on) => toggleId('tagIds', t.id, on === true)}
              />
              #{t.name}
            </Label>
          ))
        )}
      </FilterSection>

      <SheetFooter className="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValues(EMPTY_FILTERS);
            onApply(EMPTY_FILTERS);
            onClose();
          }}
        >
          Clear all
        </Button>
        <Button
          type="button"
          onClick={() => {
            onApply(values);
            onClose();
          }}
        >
          Apply
          {activeFilterCount(values) > 0 ? ` (${activeFilterCount(values)})` : ''}
        </Button>
      </SheetFooter>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h3
        className="mb-2 text-[11px] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--color-ink-faint)' }}
      >
        {title}
      </h3>
      <div className="bg-card border-border flex flex-col gap-0.5 rounded-2xl border px-3 py-2">
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground py-2 text-center text-xs">{children}</p>;
}

export type TransactionFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ActivityFilters;
  onApply: (next: ActivityFilters) => void;
};

export function TransactionFilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
}: TransactionFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filter activity</SheetTitle>
          <SheetDescription>
            Narrow the list by kind, account, category, payment method, or tag.
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <FilterBody
            key={open ? 'open' : 'closed'}
            initial={filters}
            onApply={onApply}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
