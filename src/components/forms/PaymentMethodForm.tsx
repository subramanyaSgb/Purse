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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColourPicker } from './ColourPicker';
import { COLOUR_OPTIONS } from './colourOptions';
import { IconPicker } from './IconPicker';
import type { PaymentMethod, PaymentMethodKind } from '@/domain/types';

const PM_KINDS: { value: PaymentMethodKind; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Net banking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

export type PaymentMethodFormValues = {
  name: string;
  kind: PaymentMethodKind;
  icon: string;
  colour: string;
};

function initialValuesFor(pm: PaymentMethod | null): PaymentMethodFormValues {
  if (!pm) {
    return {
      name: '',
      kind: 'upi',
      icon: 'wallet',
      colour: COLOUR_OPTIONS[0]!,
    };
  }
  return {
    name: pm.name,
    kind: pm.kind,
    icon: pm.icon,
    colour: pm.colour,
  };
}

function PaymentMethodFormBody({
  initial,
  onSave,
  onArchive,
  onClose,
}: {
  initial: PaymentMethod | null;
  onSave: (v: PaymentMethodFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<PaymentMethodFormValues>(() => initialValuesFor(initial));
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
        <Label htmlFor="pm-name">Name</Label>
        <Input
          id="pm-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. PhonePe, HDFC Credit Card"
          autoFocus
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pm-kind">Kind</Label>
        <Select
          value={values.kind}
          onValueChange={(v) => setValues((s) => ({ ...s, kind: v as PaymentMethodKind }))}
        >
          <SelectTrigger id="pm-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PM_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

export type PaymentMethodFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PaymentMethod | null;
  onSave: (v: PaymentMethodFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
};

export function PaymentMethodForm({
  open,
  onOpenChange,
  initial,
  onSave,
  onArchive,
}: PaymentMethodFormProps) {
  const isEdit = !!initial;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit payment method' : 'New payment method'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update fields or archive this payment method.'
              : 'Add a payment method such as PhonePe, a specific card, or Cash.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <PaymentMethodFormBody
            key={initial?.id ?? 'new'}
            initial={initial ?? null}
            onSave={onSave}
            onArchive={onArchive}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
