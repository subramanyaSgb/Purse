import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { transactionsRepo } from './transactions';
import { tagsRepo } from './tags';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('transactionsRepo', () => {
  it('create() inserts an expense with id, timestamps', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: 'Lunch',
      tagIds: [],
      images: [],
    });
    expect(tx.id).toHaveLength(36);
    expect(tx.kind).toBe('expense');
    expect(tx.createdAt).toEqual(tx.updatedAt);
  });

  it('create() rejects expense with amount <= 0', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 0,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        categoryId: 'cat1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/amount/i);
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: -5,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        categoryId: 'cat1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/amount/i);
  });

  it('create() requires categoryId for expense and income', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/categoryId/);
    await expect(
      transactionsRepo.create({
        kind: 'income',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/categoryId/);
  });

  it('create() requires toAccountId for transfer, and rejects same account', async () => {
    await expect(
      transactionsRepo.create({
        kind: 'transfer',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'a',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/toAccountId/);
    await expect(
      transactionsRepo.create({
        kind: 'transfer',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'a',
        toAccountId: 'a',
        note: '',
        tagIds: [],
        images: [],
      }),
    ).rejects.toThrow(/same/);
  });

  it('create() validates that tagIds are real', async () => {
    const tag = await tagsRepo.create({ name: 'Lunch' });
    // valid path
    const okTx = await transactionsRepo.create({
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: '',
      tagIds: [tag.id],
      images: [],
    });
    expect(okTx.tagIds).toEqual([tag.id]);

    // invalid path
    await expect(
      transactionsRepo.create({
        kind: 'expense',
        amount: 1,
        currency: 'INR',
        occurredAt: '2026-05-11T10:00:00.000Z',
        accountId: 'acc1',
        categoryId: 'cat1',
        note: '',
        tagIds: ['ghost-id'],
        images: [],
      }),
    ).rejects.toThrow(/tag/i);
  });

  it('update() bumps updatedAt and preserves id/createdAt', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: 'Lunch',
      tagIds: [],
      images: [],
    });
    await new Promise((r) => setTimeout(r, 5));
    const u = await transactionsRepo.update(tx.id, { amount: 120 });
    expect(u.id).toBe(tx.id);
    expect(u.createdAt).toBe(tx.createdAt);
    expect(u.amount).toBe(120);
    expect(u.updatedAt > tx.updatedAt).toBe(true);
  });

  it('update() re-validates the merged record', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: '',
      tagIds: [],
      images: [],
    });
    await expect(transactionsRepo.update(tx.id, { amount: 0 })).rejects.toThrow(/amount/i);
  });

  it('remove() hard-deletes', async () => {
    const tx = await transactionsRepo.create({
      kind: 'expense',
      amount: 100,
      currency: 'INR',
      occurredAt: '2026-05-11T10:00:00.000Z',
      accountId: 'acc1',
      categoryId: 'cat1',
      note: '',
      tagIds: [],
      images: [],
    });
    await transactionsRepo.remove(tx.id);
    expect(await transactionsRepo.get(tx.id)).toBeNull();
  });
});
