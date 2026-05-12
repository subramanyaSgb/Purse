import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Account } from '@/domain/types';

export type CreateAccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>;

export const accountsRepo = {
  async get(id: string): Promise<Account | null> {
    return (await db.accounts.get(id)) ?? null;
  },
  async list(opts: { includeArchived?: boolean } = {}): Promise<Account[]> {
    const all = await db.accounts.toArray();
    const filtered = opts.includeArchived ? all : all.filter((a) => a.archivedAt === null);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(input: CreateAccountInput): Promise<Account> {
    const now = nowIso();
    const acc: Account = {
      ...input,
      id: newId(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.accounts.add(acc);
    return acc;
  },
  async update(id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>): Promise<Account> {
    const existing = await db.accounts.get(id);
    if (!existing) throw new Error(`Account ${id} not found`);
    const updated: Account = { ...existing, ...patch, updatedAt: nowIso() };
    await db.accounts.put(updated);
    return updated;
  },
  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: nowIso() });
  },
  async unarchive(id: string): Promise<void> {
    await this.update(id, { archivedAt: null });
  },
  async remove(id: string): Promise<void> {
    const refs = await db.transactions
      .where('accountId')
      .equals(id)
      .or('toAccountId')
      .equals(id)
      .count();
    if (refs > 0) throw new Error('Account has transactions; archive instead');
    await db.accounts.delete(id);
  },
};
