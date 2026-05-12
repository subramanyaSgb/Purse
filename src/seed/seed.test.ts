import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { categoriesRepo } from '@/repo/categories';
import { subcategoriesRepo } from '@/repo/subcategories';
import { tagsRepo } from '@/repo/tags';
import { paymentMethodsRepo } from '@/repo/paymentMethods';
import { accountsRepo } from '@/repo/accounts';
import { appMetaRepo } from '@/repo/appMeta';
import { seedIfEmpty } from './seed';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, DEFAULT_TAGS } from './defaults';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('seedIfEmpty', () => {
  it('inserts everything on a fresh DB', async () => {
    await seedIfEmpty();

    const accounts = await accountsRepo.list();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.name).toBe('Cash');

    const allCats = await categoriesRepo.list();
    expect(allCats).toHaveLength(DEFAULT_CATEGORIES.length);

    const pms = await paymentMethodsRepo.list();
    expect(pms).toHaveLength(DEFAULT_PAYMENT_METHODS.length);

    const tags = await tagsRepo.list();
    expect(tags.map((t) => t.name).sort()).toEqual([...DEFAULT_TAGS].sort());

    const meta = await appMetaRepo.get();
    expect(meta).not.toBeNull();
    expect(meta?.baseCurrency).toBe('INR');
    expect(meta?.defaultAccountId).toBe(accounts[0]!.id);
  });

  it('is a no-op if appMeta already exists', async () => {
    await seedIfEmpty();
    const meta1 = await appMetaRepo.get();
    const catCountBefore = (await categoriesRepo.list()).length;

    await seedIfEmpty(); // second call

    const meta2 = await appMetaRepo.get();
    const catCountAfter = (await categoriesRepo.list()).length;

    expect(meta2?.createdAt).toBe(meta1?.createdAt);
    expect(catCountAfter).toBe(catCountBefore);
  });

  it('seeds the expected count of expense vs income categories', async () => {
    await seedIfEmpty();
    const expenses = await categoriesRepo.list({ kind: 'expense' });
    const incomes = await categoriesRepo.list({ kind: 'income' });
    const expectedExpense = DEFAULT_CATEGORIES.filter((c) => c.kind === 'expense').length;
    const expectedIncome = DEFAULT_CATEGORIES.filter((c) => c.kind === 'income').length;
    expect(expenses).toHaveLength(expectedExpense);
    expect(incomes).toHaveLength(expectedIncome);
  });

  it('seeds Temple with its four India-specific subcategories', async () => {
    await seedIfEmpty();
    const temple = (await categoriesRepo.list()).find((c) => c.name === 'Temple');
    expect(temple).toBeDefined();
    const subs = await subcategoriesRepo.list({ categoryId: temple!.id });
    expect(subs.map((s) => s.name).sort()).toEqual(
      ['General', 'Donation', 'Prasadam', 'Kalyanostsawam'].sort(),
    );
  });

  it('rolls back atomically if something fails mid-seed', async () => {
    // Pre-insert a colliding tag so the unique &nameLower index in the
    // seed transaction throws \xe2\x80\x94 nothing else from this seed run should
    // persist. (No appMeta row yet, so a second run would try again.)
    await db.tags.add({
      id: 'pre-existing',
      name: 'reimburse-pending',
      nameLower: 'reimburse-pending',
      usageCount: 0,
      lastUsedAt: null,
    });

    await expect(seedIfEmpty()).rejects.toThrow();

    // Nothing else got committed:
    expect(await appMetaRepo.get()).toBeNull();
    expect(await accountsRepo.list()).toHaveLength(0);
    expect(await categoriesRepo.list()).toHaveLength(0);
    expect(await paymentMethodsRepo.list()).toHaveLength(0);
  });
});
