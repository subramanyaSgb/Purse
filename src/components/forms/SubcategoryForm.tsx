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
import { IconPicker } from './IconPicker';
import { TxFieldRow } from './TxFieldRow';
import { iconByName } from './iconOptions';
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
  parentColour,
  parentName,
  onSave,
  onArchive,
  onClose,
}: {
  initial: Subcategory | null;
  parentIcon: string;
  parentColour: string;
  parentName: string;
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-6">
      {/* Preview tile — uses parent category colour to make the inherited
          theming obvious to the user. */}
      <div className="flex items-center gap-3 pt-2">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-2xl"
          style={{ background: parentColour, color: '#fff' }}
        >
          {createElement(iconByName(values.icon), {
            className: 'size-5',
            strokeWidth: 1.8,
          })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-base font-semibold">
            {values.name.trim() || 'New subcategory'}
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">under {parentName}</div>
        </div>
      </div>

      <TxFieldRow label="Name">
        <Input
          id="sub-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Groceries"
          autoFocus
          required
        />
      </TxFieldRow>

      <TxFieldRow label="Icon" hint="colour inherits from the parent">
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
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create subcategory'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export type SubcategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Subcategory | null;
  /** Parent category icon — default for new subcategories. */
  parentIcon: string;
  /** Parent category colour — used for the preview tile. */
  parentColour: string;
  /** Parent category name — shown in the 'under <parent>' label. */
  parentName: string;
  onSave: (v: SubcategoryFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
};

export function SubcategoryForm({
  open,
  onOpenChange,
  initial,
  parentIcon,
  parentColour,
  parentName,
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
            parentColour={parentColour}
            parentName={parentName}
            onSave={onSave}
            onArchive={onArchive}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
