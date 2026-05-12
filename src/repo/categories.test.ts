import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { categoriesRepo } from './categories';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('categoriesRepo', () => {
  it('create() inserts with generated id and timestamps', async () => {
    const c = await categoriesRepo.create({
      name: 'Food',
      kind: 'expense',
      colour: '#f59e0b',
      icon: 'utensils',
    });
    expect(c.id).toHaveLength(36);
    expect(c.createdAt).toEqual(c.updatedAt);
    expect(c.archivedAt).toBeNull();
  });

  it('list() returns non-archived categories sorted by name', async () => {
    await categoriesRepo.create({
      name: 'Zebra',
      kind: 'expense',
      colour: '#000',
      icon: 'z',
    });
    await categoriesRepo.create({
      name: 'Apple',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
    });
    const archived = await categoriesRepo.create({
      name: 'Mango',
      kind: 'expense',
      colour: '#000',
      icon: 'm',
    });
    await categoriesRepo.archive(archived.id);
    const list = await categoriesRepo.list();
    expect(list.map((x) => x.name)).toEqual(['Apple', 'Zebra']);
  });

  it('list({ kind }) filters by kind', async () => {
    await categoriesRepo.create({
      name: 'Food',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
    });
    await categoriesRepo.create({
      name: 'Salary',
      kind: 'income',
      colour: '#000',
      icon: 'a',
    });
    const expenses = await categoriesRepo.list({ kind: 'expense' });
    expect(expenses.map((x) => x.name)).toEqual(['Food']);
    const incomes = await categoriesRepo.list({ kind: 'income' });
    expect(incomes.map((x) => x.name)).toEqual(['Salary']);
  });

  it('update() bumps updatedAt', async () => {
    const c = await categoriesRepo.create({
      name: 'A',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
    });
    await new Promise((r) => setTimeout(r, 5));
    const u = await categoriesRepo.update(c.id, { name: 'B' });
    expect(u.name).toBe('B');
    expect(u.updatedAt > c.updatedAt).toBe(true);
  });

  it('remove() hard-deletes if unreferenced', async () => {
    const c = await categoriesRepo.create({
      name: 'A',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
    });
    await categoriesRepo.remove(c.id);
    expect(await categoriesRepo.get(c.id)).toBeNull();
  });

  it('remove() rejects when a subcategory references the category', async () => {
    const c = await categoriesRepo.create({
      name: 'A',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
    });
    await db.subcategories.add({
      id: 'sub1',
      categoryId: c.id,
      name: 'Sub',
      icon: 'a',
      archivedAt: null,
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    await expect(categoriesRepo.remove(c.id)).rejects.toThrow();
  });

  it('remove() rejects when a transaction references the category', async () => {
    const c = await categoriesRepo.create({
      name: 'A',
      kind: 'expense',
      colour: '#000',
      icon: 'a',
    });
    await db.transactions.add({
      id: 't1',
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T00:00:00.000Z',
      accountId: 'acc',
      categoryId: c.id,
      note: '',
      tagIds: [],
      images: [],
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    await expect(categoriesRepo.remove(c.id)).rejects.toThrow();
  });
});
