import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { tagsRepo } from './tags';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('tagsRepo', () => {
  it('create() lowercases nameLower and sets usageCount=0', async () => {
    const t = await tagsRepo.create({ name: 'Food' });
    expect(t.id).toHaveLength(36);
    expect(t.name).toBe('Food');
    expect(t.nameLower).toBe('food');
    expect(t.usageCount).toBe(0);
    expect(t.lastUsedAt).toBeNull();
  });

  it('create() rejects duplicate names case-insensitively', async () => {
    await tagsRepo.create({ name: 'Food' });
    await expect(tagsRepo.create({ name: 'FOOD' })).rejects.toThrow();
  });

  it('findOrCreate() returns existing tag when nameLower matches', async () => {
    const a = await tagsRepo.findOrCreate('Food');
    const b = await tagsRepo.findOrCreate('FOOD');
    expect(a.id).toBe(b.id);
  });

  it('findOrCreate() bumps usageCount and lastUsedAt on every call', async () => {
    const a = await tagsRepo.findOrCreate('Food');
    expect(a.usageCount).toBe(1);
    expect(a.lastUsedAt).not.toBeNull();

    await new Promise((r) => setTimeout(r, 5));
    const b = await tagsRepo.findOrCreate('food');
    expect(b.usageCount).toBe(2);
    expect((b.lastUsedAt ?? '') > (a.lastUsedAt ?? '')).toBe(true);
  });

  it('list() sorts by usageCount desc, then name asc', async () => {
    const a = await tagsRepo.findOrCreate('Apple');
    await tagsRepo.findOrCreate('Apple');
    await tagsRepo.findOrCreate('Apple');
    void a;
    await tagsRepo.findOrCreate('Banana');
    await tagsRepo.findOrCreate('Banana');
    await tagsRepo.findOrCreate('Cherry');
    const list = await tagsRepo.list();
    expect(list.map((t) => t.name)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('list() breaks ties by name asc', async () => {
    await tagsRepo.findOrCreate('Zebra');
    await tagsRepo.findOrCreate('Apple');
    const list = await tagsRepo.list();
    expect(list.map((t) => t.name)).toEqual(['Apple', 'Zebra']);
  });

  it('remove() hard-deletes', async () => {
    const t = await tagsRepo.create({ name: 'X' });
    await tagsRepo.remove(t.id);
    expect(await tagsRepo.get(t.id)).toBeNull();
  });
});
