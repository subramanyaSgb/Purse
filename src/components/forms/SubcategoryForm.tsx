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
import { IconPicker } from './IconPicker';
import type { Subcategory } from '@/domain/types';

export type SubcategoryFormValues = {
  name: string;
  icon: string;
};

function initialValuesFor(s: Subcategory | null, parentIcon: string): SubcategoryFormValues {
  if (!s) return { name: '', icon: parentIcon };
  return { name: s.name, icon: s.icon };
}

function SubcategoryFormBody({
  initial,
  parentIcon,
  onSave,
  onArchive,
  onClose,
}: {
  initial: Subcategory | null;
  parentIcon: string;
  onSave: (v: SubcategoryFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<SubcategoryFormValues>(() =>
    initialValuesFor(initial, parentIcon),
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
        <Label htmlFor="sub-name">Name</Label>
        <Input
          id="sub-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Groceries"
          autoFocus
          required
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

export type SubcategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Subcategory | null;
  /** Parent category icon \xe2\x80\x94 default for new subcategories. */
  parentIcon: string;
  onSave: (v: SubcategoryFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
};

export function SubcategoryForm({
  open,
  onOpenChange,
  initial,
  parentIcon,
  onSave,
  onArchive,
}: SubcategoryFormProps) {
  const isEdit = !!initial;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit subcategory' : 'New subcategory'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update fields or archive this subcategory.'
              : 'Pick a name; colour is inherited from the parent category.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <SubcategoryFormBody
            key={initial?.id ?? 'new'}
            initial={initial ?? null}
            parentIcon={parentIcon}
            onSave={onSave}
            onArchive={onArchive}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
