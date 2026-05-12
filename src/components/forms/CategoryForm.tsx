import { createElement, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ColourPicker } from './ColourPicker';
import { COLOUR_OPTIONS } from './colourOptions';
import { IconPicker } from './IconPicker';
import { TxFieldRow } from './TxFieldRow';
import { iconByName } from './iconOptions';
import type { Category, CategoryKind } from '@/domain/types';

export type CategoryFormValues = {
  name: string;
  kind: CategoryKind;
  colour: string;
  icon: string;
};

function initialValuesFor(
  category: Category | null,
  defaultKind: CategoryKind,
): CategoryFormValues {
  if (!category) {
    return {
      name: '',
      kind: defaultKind,
      colour: COLOUR_OPTIONS[0]!,
      icon: 'wallet',
    };
  }
  return {
    name: category.name,
    kind: category.kind,
    colour: category.colour,
    icon: category.icon,
  };
}

function CategoryFormBody({
  initial,
  defaultKind,
  onSave,
  onArchive,
  onClose,
}: {
  initial: Category | null;
  defaultKind: CategoryKind;
  onSave: (v: CategoryFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<CategoryFormValues>(() =>
    initialValuesFor(initial, defaultKind),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...values, name: values.name.trim() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-6">
      {/* Preview tile — matches how the category renders on /settings/categories */}
      <div className="flex items-center gap-3 pt-2">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-2xl"
          style={{ background: values.colour, color: '#fff' }}
        >
          {createElement(iconByName(values.icon), {
            className: 'size-5',
            strokeWidth: 1.8,
          })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-base font-semibold">
            {values.name.trim() || 'New category'}
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs capitalize">{values.kind}</div>
        </div>
      </div>

      <TxFieldRow label="Name">
        <Input
          id="cat-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Groceries"
          autoFocus
          required
        />
      </TxFieldRow>

      <TxFieldRow label="Kind">
        <RadioGroup
          value={values.kind}
          onValueChange={(v) => setValues((s) => ({ ...s, kind: v as CategoryKind }))}
          className="flex gap-3"
        >
          <Label
            htmlFor="kind-expense"
            className="bg-card border-border flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 font-normal"
          >
            <RadioGroupItem id="kind-expense" value="expense" />
            Expense
          </Label>
          <Label
            htmlFor="kind-income"
            className="bg-card border-border flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 font-normal"
          >
            <RadioGroupItem id="kind-income" value="income" />
            Income
          </Label>
        </RadioGroup>
      </TxFieldRow>

      <TxFieldRow label="Colour">
        <div className="bg-card border-border rounded-xl border p-3">
          <ColourPicker
            value={values.colour}
            onChange={(c) => setValues((v) => ({ ...v, colour: c }))}
          />
        </div>
      </TxFieldRow>

      <TxFieldRow label="Icon">
        <div className="bg-card border-border rounded-xl border p-3">
          <IconPicker value={values.icon} onChange={(i) => setValues((v) => ({ ...v, icon: i }))} />
        </div>
      </TxFieldRow>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <SheetFooter className="flex-col gap-2 sm:flex-row">
        {isEdit && onArchive ? (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onArchive();
              onClose();
            }}
            disabled={saving}
            className="gap-2"
            style={{
              background: 'rgba(255,136,102,0.10)',
              borderColor: 'rgba(255,136,102,0.3)',
              color: 'var(--color-expense)',
            }}
          >
            <Trash2 className="size-4" />
            Archive
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create category'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export type CategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Category | null;
  /** Selected kind toggle on the parent page — used to default new rows. */
  defaultKind: CategoryKind;
  onSave: (v: CategoryFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
};

export function CategoryForm({
  open,
  onOpenChange,
  initial,
  defaultKind,
  onSave,
  onArchive,
}: CategoryFormProps) {
  const isEdit = !!initial;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit category' : 'New category'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update fields or archive this category.'
              : 'Categories group your transactions, e.g. Food, Travel.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <CategoryFormBody
            key={initial?.id ?? `new-${defaultKind}`}
            initial={initial ?? null}
            defaultKind={defaultKind}
            onSave={onSave}
            onArchive={onArchive}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
