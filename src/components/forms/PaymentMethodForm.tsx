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
import { TxFieldRow } from './TxFieldRow';
import { iconByName } from './iconOptions';
import type { PaymentMethod, PaymentMethodKind } from '@/domain/types';

const PM_KINDS: { value: PaymentMethodKind; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Net banking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

const KIND_LABEL: Record<PaymentMethodKind, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  netbanking: 'Net banking',
  wallet: 'Wallet',
  other: 'Other',
};

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-6">
      {/* Preview tile — matches /settings/payment-methods row appearance */}
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
            {values.name.trim() || 'New payment method'}
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs uppercase">
            {KIND_LABEL[values.kind]}
          </div>
        </div>
      </div>

      <TxFieldRow label="Name">
        <Input
          id="pm-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. PhonePe, HDFC Credit Card"
          autoFocus
          required
        />
      </TxFieldRow>

      <TxFieldRow label="Kind">
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
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create payment method'}
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
