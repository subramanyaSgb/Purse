import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appMetaRepo } from '@/repo/appMeta';
import { accountsRepo } from '@/repo/accounts';
import type { TxKind } from '@/domain/types';

const APP_META_QUERY_KEY = ['appMeta'] as const;
const ACCOUNTS_QUERY_KEY = ['accounts'] as const;

export function ProfileSection() {
  const qc = useQueryClient();
  const { data: meta } = useQuery({
    queryKey: APP_META_QUERY_KEY,
    queryFn: () => appMetaRepo.get(),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => accountsRepo.list(),
  });

  // Local mirror of name so we only persist on blur (not every keystroke).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const displayName = nameDraft ?? meta?.userName ?? '';

  const persist = useMutation({
    mutationFn: (patch: Parameters<typeof appMetaRepo.update>[0]) => appMetaRepo.update(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: APP_META_QUERY_KEY });
    },
  });

  if (!meta) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Profile
      </h2>
      <div className="bg-card flex flex-col gap-4 rounded-md border p-4">
        <div className="grid gap-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={displayName}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              if (nameDraft !== null && nameDraft !== meta.userName) {
                persist.mutate({ userName: nameDraft.trim() });
              }
              setNameDraft(null);
            }}
            placeholder="Your name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-currency">Base currency</Label>
          <Input id="profile-currency" value={meta.baseCurrency} readOnly disabled />
          <p className="text-muted-foreground text-xs">Only INR is supported in v0.1.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-default-account">Default account</Label>
          <Select
            value={meta.defaultAccountId ?? ''}
            onValueChange={(v) => persist.mutate({ defaultAccountId: v || undefined })}
          >
            <SelectTrigger id="profile-default-account">
              <SelectValue placeholder="Pick an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-default-kind">Default transaction kind</Label>
          <Select
            value={meta.defaultTxKind}
            onValueChange={(v) => persist.mutate({ defaultTxKind: v as TxKind })}
          >
            <SelectTrigger id="profile-default-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <Label htmlFor="profile-gps">GPS auto-capture</Label>
            <p className="text-muted-foreground text-xs">
              Suggest your current location when adding a transaction.
            </p>
          </div>
          <Switch
            id="profile-gps"
            checked={meta.gpsEnabled}
            onCheckedChange={(checked) => persist.mutate({ gpsEnabled: checked })}
          />
        </div>
      </div>
    </section>
  );
}
