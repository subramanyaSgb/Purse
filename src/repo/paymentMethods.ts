import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { PaymentMethod, PaymentMethodKind } from '@/domain/types';

export type CreatePaymentMethodInput = Omit<PaymentMethod, 'id' | 'archivedAt'>;

export type ListPaymentMethodsOptions = {
  includeArchived?: boolean;
  kind?: PaymentMethodKind;
};

export const paymentMethodsRepo = {
  async get(id: string): Promise<PaymentMethod | null> {
    return (await db.paymentMethods.get(id)) ?? null;
  },
  async list(opts: ListPaymentMethodsOptions = {}): Promise<PaymentMethod[]> {
    const all = await db.paymentMethods.toArray();
    const filtered = all.filter((p) => {
      if (!opts.includeArchived && p.archivedAt !== null) return false;
      if (opts.kind && p.kind !== opts.kind) return false;
      return true;
    });
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const p: PaymentMethod = {
      ...input,
      id: newId(),
      archivedAt: null,
    };
    await db.paymentMethods.add(p);
    return p;
  },
  async update(id: string, patch: Partial<Omit<PaymentMethod, 'id'>>): Promise<PaymentMethod> {
    const existing = await db.paymentMethods.get(id);
    if (!existing) throw new Error(`Payment method ${id} not found`);
    const updated: PaymentMethod = { ...existing, ...patch };
    await db.paymentMethods.put(updated);
    return updated;
  },
  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: nowIso() });
  },
  async unarchive(id: string): Promise<void> {
    await this.update(id, { archivedAt: null });
  },
  async remove(id: string): Promise<void> {
    const refs = await db.transactions.where('paymentMethodId').equals(id).count();
    if (refs > 0) throw new Error('Payment method has transactions; archive instead');
    await db.paymentMethods.delete(id);
  },
};
