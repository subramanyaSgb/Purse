import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Category, CategoryKind } from '@/domain/types';

export type CreateCategoryInput = Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>;

export type ListCategoriesOptions = {
  includeArchived?: boolean;
  kind?: CategoryKind;
};

export const categoriesRepo = {
  async get(id: string): Promise<Category | null> {
    return (await db.categories.get(id)) ?? null;
  },
  async list(opts: ListCategoriesOptions = {}): Promise<Category[]> {
    const all = await db.categories.toArray();
    const filtered = all.filter((c) => {
      if (!opts.includeArchived && c.archivedAt !== null) return false;
      if (opts.kind && c.kind !== opts.kind) return false;
      return true;
    });
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
  async create(input: CreateCategoryInput): Promise<Category> {
    const now = nowIso();
    const cat: Category = {
      ...input,
      id: newId(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.categories.add(cat);
    return cat;
  },
  async update(id: string, patch: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category> {
    const existing = await db.categories.get(id);
    if (!existing) throw new Error(`Category ${id} not found`);
    const updated: Category = { ...existing, ...patch, updatedAt: nowIso() };
    await db.categories.put(updated);
    return updated;
  },
  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: nowIso() });
  },
  async unarchive(id: string): Promise<void> {
    await this.update(id, { archivedAt: null });
  },
  async remove(id: string): Promise<void> {
    const subRefs = await db.subcategories.where('categoryId').equals(id).count();
    if (subRefs > 0) throw new Error('Category has subcategories; remove them first');
    const txRefs = await db.transactions.where('categoryId').equals(id).count();
    if (txRefs > 0) throw new Error('Category has transactions; archive instead');
    await db.categories.delete(id);
  },
};
