import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Transaction } from '@/domain/types';

export type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

function validate(tx: CreateTransactionInput | Transaction): void {
  if (!(tx.amount > 0)) {
    throw new Error('Transaction amount must be positive');
  }
  if (tx.kind === 'transfer') {
    if (!tx.toAccountId) {
      throw new Error('Transfer requires toAccountId');
    }
    if (tx.accountId === tx.toAccountId) {
      throw new Error('Transfer accountId and toAccountId must not be the same');
    }
  } else {
    // expense | income
    if (!tx.categoryId) {
      throw new Error(`${tx.kind} requires categoryId`);
    }
  }
}

async function validateTags(tagIds: readonly string[]): Promise<void> {
  if (tagIds.length === 0) return;
  for (const id of tagIds) {
    const t = await db.tags.get(id);
    if (!t) throw new Error(`Tag ${id} not found`);
  }
}

export const transactionsRepo = {
  async get(id: string): Promise<Transaction | null> {
    return (await db.transactions.get(id)) ?? null;
  },
  async create(input: CreateTransactionInput): Promise<Transaction> {
    validate(input);
    await validateTags(input.tagIds);
    const now = nowIso();
    const tx: Transaction = {
      ...input,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    await db.transactions.add(tx);
    return tx;
  },
  async update(
    id: string,
    patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
  ): Promise<Transaction> {
    const existing = await db.transactions.get(id);
    if (!existing) throw new Error(`Transaction ${id} not found`);
    const merged: Transaction = { ...existing, ...patch, updatedAt: nowIso() };
    validate(merged);
    if (patch.tagIds) await validateTags(patch.tagIds);
    await db.transactions.put(merged);
    return merged;
  },
  async remove(id: string): Promise<void> {
    await db.transactions.delete(id);
  },
};
