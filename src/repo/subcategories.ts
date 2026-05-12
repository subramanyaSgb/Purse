import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Subcategory } from '@/domain/types';

export type CreateSubcategoryInput = Omit<
  Subcategory,
  'id' | 'createdAt' | 'updatedAt' | 'archivedAt'
>;

export type ListSubcategoriesOptions = {
  includeArchived?: boolean;
  categoryId?: string;
};

export const subcategoriesRepo = {
  async get(id: string): Promise<Subcategory | null> {
    return (await db.subcategories.get(id)) ?? null;
  },
  async list(opts: ListSubcategoriesOptions = {}): Promise<Subcategory[]> {
    const all = await db.subcategories.toArray();
    const filtered = all.filter((s) => {
      if (!opts.includeArchived && s.archivedAt !== null) return false;
      if (opts.categoryId && s.categoryId !== opts.categoryId) return false;
      return true;
    });
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(input: CreateSubcategoryInput): Promise<Subcategory> {
    const now = nowIso();
    const sub: Subcategory = {
      ...input,
      id: newId(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.subcategories.add(sub);
    return sub;
  },
  async update(
    id: string,
    patch: Partial<Omit<Subcategory, 'id' | 'createdAt'>>,
  ): Promise<Subcategory> {
    const existing = await db.subcategories.get(id);
    if (!existing) throw new Error(`Subcategory ${id} not found`);
    const updated: Subcategory = { ...existing, ...patch, updatedAt: nowIso() };
    await db.subcategories.put(updated);
    return updated;
  },
  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: nowIso() });
  },
  async unarchive(id: string): Promise<void> {
    await this.update(id, { archivedAt: null });
  },
  async remove(id: string): Promise<void> {
    const refs = await db.transactions.where('subcategoryId').equals(id).count();
    if (refs > 0) throw new Error('Subcategory has transactions; archive instead');
    await db.subcategories.delete(id);
  },
};
