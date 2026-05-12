import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColourPicker } from './ColourPicker';
import { COLOUR_OPTIONS } from './colourOptions';
import { IconPicker } from './IconPicker';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
      <div className="grid gap-2">
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Groceries"
          autoFocus
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Kind</Label>
        <RadioGroup
          value={values.kind}
          onValueChange={(v) => setValues((s) => ({ ...s, kind: v as CategoryKind }))}
          className="flex gap-4"
        >
          <Label className="flex items-center gap-2 font-normal">
            <RadioGroupItem value="expense" /> Expense
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <RadioGroupItem value="income" /> Income
          </Label>
        </RadioGroup>
      </div>

      <div className="grid gap-2">
        <Label>Colour</Label>
        <ColourPicker
          value={values.colour}
          onChange={(c) => setValues((v) => ({ ...v, colour: c }))}
        />
      </div>

      <div className="grid gap-2">
        <Label>Icon</Label>
        <IconPicker value={values.icon} onChange={(i) => setValues((v) => ({ ...v, icon: i }))} />
      </div>

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
          >
            <Trash2 className="mr-2 size-4" />
            Archive
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export type CategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Category | null;
  /** Selected kind toggle on the parent page \xe2\x80\x94 used to default new rows. */
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
