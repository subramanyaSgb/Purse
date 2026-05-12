import { useState } from 'react';
import { Archive as ArchiveIcon, Trash2 } from 'lucide-react';
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
  /**
   * Permanently delete the account. Throws "Account has transactions;
   * archive instead" when the row is still referenced — the form
   * surfaces that as an inline error and keeps the sheet open so the
   * user can use Archive instead.
   */
  onRemove?: () => Promise<void> | void;
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
  onRemove,
  onClose,
}: {
  initial: Account | null;
  onSave: (values: AccountFormValues) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<AccountFormValues>(() => initialValuesFor(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two-tap delete: the first tap reveals an inline confirmation row,
  // the second tap inside that row actually fires onRemove. Keeps an
  // irreversible action from being one accidental tap away without
  // dragging in a confirm-modal-on-sheet.
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const previewInitial = (values.name[0] ?? '?').toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-6">
      {/* Preview tile — mirrors how the account renders on /accounts */}
      <div className="flex items-center gap-3 pt-2">
        <span
          aria-hidden
          className="font-display grid size-14 place-items-center rounded-2xl text-xl font-bold"
          style={{
            background: `linear-gradient(135deg, ${values.colour} 0%, color-mix(in srgb, ${values.colour} 60%, #000) 100%)`,
            color: '#0A0908',
          }}
        >
          {previewInitial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-base font-semibold">
            {values.name.trim() || 'New account'}
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs capitalize">
            {values.type}
            {values.bankName?.trim() ? ` · ${values.bankName.trim()}` : ''}
          </div>
        </div>
      </div>

      <TxFieldRow label="Name">
        <Input
          id="acc-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. HDFC Savings"
          autoFocus
          required
        />
      </TxFieldRow>

      <TxFieldRow label="Type">
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
      </TxFieldRow>

      {TYPES_WITH_BANK_NAME.has(values.type) ? (
        <TxFieldRow label="Bank name" hint="optional">
          <Input
            id="acc-bank"
            value={values.bankName ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, bankName: e.target.value }))}
            placeholder="e.g. HDFC, ICICI"
          />
        </TxFieldRow>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <TxFieldRow label="Currency">
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
        </TxFieldRow>
        <TxFieldRow label="Opening balance">
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
            className="font-mono tabular"
          />
        </TxFieldRow>
      </div>

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

      {isEdit && confirmDelete ? (
        <div
          role="alertdialog"
          aria-label="Confirm delete account"
          className="border-border flex flex-col gap-3 rounded-2xl border p-4"
          style={{ background: 'rgba(255,136,102,0.08)' }}
        >
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: 'var(--color-expense)' }}
            >
              Delete this account permanently?
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              This cannot be undone. If any transactions reference this account, Delete
              will fail — use Archive instead to hide it without losing history.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={saving}
              className="flex-1 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                if (!onRemove) return;
                setSaving(true);
                setError(null);
                try {
                  await onRemove();
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to delete');
                  setConfirmDelete(false);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="flex-1 cursor-pointer gap-2"
              style={{
                background: 'var(--color-expense)',
                color: '#fff',
              }}
            >
              <Trash2 className="size-4" />
              Yes, delete
            </Button>
          </div>
        </div>
      ) : null}

      <SheetFooter className="flex-col gap-2 sm:flex-row">
        {isEdit && onRemove && !confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
            className="cursor-pointer gap-2"
            style={{
              background: 'rgba(255,136,102,0.10)',
              borderColor: 'rgba(255,136,102,0.3)',
              color: 'var(--color-expense)',
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : null}
        {isEdit && onArchive && !confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onArchive();
              onClose();
            }}
            disabled={saving}
            className="cursor-pointer gap-2"
          >
            <ArchiveIcon className="size-4" />
            Archive
          </Button>
        ) : null}
        {!confirmDelete ? (
          <Button type="submit" disabled={saving} className="cursor-pointer">
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create account'}
          </Button>
        ) : null}
      </SheetFooter>
    </form>
  );
}

export function AccountForm({
  open,
  onOpenChange,
  initial,
  onSave,
  onArchive,
  onRemove,
}: AccountFormProps) {
  const isEdit = !!initial;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit account' : 'New account'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update fields, archive to hide, or delete to remove permanently.'
              : 'Add a new account such as Cash, a bank balance, or a credit card.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <AccountFormBody
            key={initial?.id ?? 'new'}
            initial={initial ?? null}
            onSave={onSave}
            onArchive={onArchive}
            onRemove={onRemove}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
