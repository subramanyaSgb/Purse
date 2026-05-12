import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { accountsRepo } from './accounts';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('accountsRepo', () => {
  it('create() inserts with generated id and timestamps', async () => {
    const a = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#0f172a',
      icon: 'wallet',
    });
    expect(a.id).toHaveLength(36);
    expect(a.createdAt).toEqual(a.updatedAt);
    expect(a.archivedAt).toBeNull();
  });

  it('list() returns non-archived accounts by default', async () => {
    await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    const b = await accountsRepo.create({
      name: 'B',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await accountsRepo.archive(b.id);
    const list = await accountsRepo.list();
    expect(list.map((x) => x.name)).toEqual(['A']);
  });

  it('list({ includeArchived: true }) returns all', async () => {
    await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    const b = await accountsRepo.create({
      name: 'B',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await accountsRepo.archive(b.id);
    const list = await accountsRepo.list({ includeArchived: true });
    expect(list).toHaveLength(2);
  });

  it('update() bumps updatedAt, preserves id', async () => {
    const a = await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await new Promise((r) => setTimeout(r, 5));
    const u = await accountsRepo.update(a.id, { name: 'A2' });
    expect(u.id).toBe(a.id);
    expect(u.name).toBe('A2');
    expect(u.updatedAt > a.updatedAt).toBe(true);
  });

  it('remove() hard-deletes if no transactions reference it', async () => {
    const a = await accountsRepo.create({
      name: 'A',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'b',
    });
    await accountsRepo.remove(a.id);
    expect(await accountsRepo.get(a.id)).toBeNull();
  });
});
