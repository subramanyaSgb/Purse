import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { subcategoriesRepo } from './subcategories';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('subcategoriesRepo', () => {
  it('create() inserts with id, timestamps, archivedAt = null', async () => {
    const s = await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'Groceries',
      icon: 'shopping-cart',
    });
    expect(s.id).toHaveLength(36);
    expect(s.archivedAt).toBeNull();
    expect(s.createdAt).toEqual(s.updatedAt);
  });

  it('list({ categoryId }) returns only that parent, sorted by name', async () => {
    await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'Zebra',
      icon: 'z',
    });
    await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'Apple',
      icon: 'a',
    });
    await subcategoriesRepo.create({
      categoryId: 'cat2',
      name: 'Other',
      icon: 'o',
    });
    const list = await subcategoriesRepo.list({ categoryId: 'cat1' });
    expect(list.map((x) => x.name)).toEqual(['Apple', 'Zebra']);
  });

  it('list() without filter returns all non-archived', async () => {
    await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'A',
      icon: 'a',
    });
    const b = await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'B',
      icon: 'b',
    });
    await subcategoriesRepo.archive(b.id);
    const list = await subcategoriesRepo.list();
    expect(list).toHaveLength(1);
  });

  it('update() bumps updatedAt', async () => {
    const s = await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'A',
      icon: 'a',
    });
    await new Promise((r) => setTimeout(r, 5));
    const u = await subcategoriesRepo.update(s.id, { name: 'A2' });
    expect(u.updatedAt > s.updatedAt).toBe(true);
  });

  it('remove() rejects when a transaction references it', async () => {
    const s = await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'A',
      icon: 'a',
    });
    await db.transactions.add({
      id: 't1',
      kind: 'expense',
      amount: 1,
      currency: 'INR',
      occurredAt: '2026-05-11T00:00:00.000Z',
      accountId: 'acc',
      categoryId: 'cat1',
      subcategoryId: s.id,
      note: '',
      tagIds: [],
      images: [],
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    });
    await expect(subcategoriesRepo.remove(s.id)).rejects.toThrow();
  });

  it('remove() hard-deletes if unreferenced', async () => {
    const s = await subcategoriesRepo.create({
      categoryId: 'cat1',
      name: 'A',
      icon: 'a',
    });
    await subcategoriesRepo.remove(s.id);
    expect(await subcategoriesRepo.get(s.id)).toBeNull();
  });
});
