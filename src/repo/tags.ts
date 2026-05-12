import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Tag } from '@/domain/types';

export type CreateTagInput = { name: string };

export const tagsRepo = {
  async get(id: string): Promise<Tag | null> {
    return (await db.tags.get(id)) ?? null;
  },
  async findByName(name: string): Promise<Tag | null> {
    return (await db.tags.where('nameLower').equals(name.toLowerCase()).first()) ?? null;
  },
  async list(): Promise<Tag[]> {
    const all = await db.tags.toArray();
    return all.sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));
  },
  async create(input: CreateTagInput): Promise<Tag> {
    const tag: Tag = {
      id: newId(),
      name: input.name,
      nameLower: input.name.toLowerCase(),
      usageCount: 0,
      lastUsedAt: null,
    };
    // The `&nameLower` unique index causes db.tags.add to throw on
    // collision \xe2\x80\x94 we propagate it as the duplicate-name signal.
    await db.tags.add(tag);
    return tag;
  },
  async findOrCreate(name: string): Promise<Tag> {
    const existing = await this.findByName(name);
    const now = nowIso();
    if (existing) {
      const updated: Tag = {
        ...existing,
        usageCount: existing.usageCount + 1,
        lastUsedAt: now,
      };
      await db.tags.put(updated);
      return updated;
    }
    const tag: Tag = {
      id: newId(),
      name,
      nameLower: name.toLowerCase(),
      usageCount: 1,
      lastUsedAt: now,
    };
    await db.tags.add(tag);
    return tag;
  },
  async remove(id: string): Promise<void> {
    await db.tags.delete(id);
  },
};
