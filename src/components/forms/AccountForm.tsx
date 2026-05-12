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
import type { Account, AccountType } from '@/domain/types';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Credit card' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'savings', label: 'Savings' },
  { value: 'rd', label: 'Recurring deposit' },
  { value: 'asset', label: 'Asset' },
];

const TYPES_WITH_BANK_NAME = new Set<AccountType>(['bank', 'savings', 'card']);

export type AccountFormValues = {
  name: string;
  type: AccountType;
  bankName?: string;
  currency: string;
  openingBalance: number;
  colour: string;
  icon: string;
};

const DEFAULT_VALUES: AccountFormValues = {
  name: '',
  type: 'bank',
  bankName: '',
  currency: 'INR',
  openingBalance: 0,
  colour: COLOUR_OPTIONS[0]!,
  icon: 'wallet',
};

function initialValuesFor(account: Account | null): AccountFormValues {
  if (!account) return DEFAULT_VALUES;
  return {
    name: account.name,
    type: account.type,
    bankName: account.bankName ?? '',
    currency: account.currency,
    openingBalance: account.openingBalance,
    colour: account.colour,
    icon: account.icon,
  };
}

export type AccountFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form opens in edit mode pre-filled with this account. */
  initial?: Account | null;
  onSave: (values: AccountFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
};

/**
 * Inner form body — keyed by the `initial` row id so a fresh row resets
 * local state cleanly without a state-resetting useEffect (which would
 * trip react-hooks/set-state-in-effect under React 19).
 */
function AccountFormBody({
  initial,
  onSave,
  onArchive,
  onClose,
}: {
  initial: Account | null;
  onSave: (values: AccountFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<AccountFormValues>(() => initialValuesFor(initial));
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
      const payload: AccountFormValues = {
        ...values,
        name: values.name.trim(),
        bankName: TYPES_WITH_BANK_NAME.has(values.type)
          ? values.bankName?.trim() || undefined
          : undefined,
      };
      await onSave(payload);
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
        <Label htmlFor="acc-name">Name</Label>
        <Input
          id="acc-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. HDFC Savings"
          autoFocus
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="acc-type">Type</Label>
        <Select
          value={values.type}
          onValueChange={(v) => setValues((s) => ({ ...s, type: v as AccountType }))}
        >
          <SelectTrigger id="acc-type">
            <SelectValue placeholder="Pick a type" />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {TYPES_WITH_BANK_NAME.has(values.type) ? (
        <div className="grid gap-2">
          <Label htmlFor="acc-bank">Bank name (optional)</Label>
          <Input
            id="acc-bank"
            value={values.bankName ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, bankName: e.target.value }))}
            placeholder="e.g. HDFC, ICICI"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="acc-currency">Currency</Label>
          <Input
            id="acc-currency"
            value={values.currency}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                currency: e.target.value.toUpperCase().slice(0, 3),
              }))
            }
            maxLength={3}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="acc-opening">Opening balance</Label>
          <Input
            id="acc-opening"
            type="number"
            inputMode="decimal"
            value={Number.isFinite(values.openingBalance) ? values.openingBalance : 0}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                openingBalance: e.target.value === '' ? 0 : Number(e.target.value),
              }))
            }
          />
        </div>
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

export function AccountForm({ open, onOpenChange, initial, onSave, onArchive }: AccountFormProps) {
  const isEdit = !!initial;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit account' : 'New account'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the fields below or archive this account.'
              : 'Add a new account such as Cash, a bank balance, or a credit card.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <AccountFormBody
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
