import { db } from '@/db/db';
import { nowIso } from '@/lib/ids';
import type { AppMeta } from '@/domain/types';

const SINGLETON_ID = 'singleton' as const;

export type AppMetaPatch = Partial<Omit<AppMeta, 'id' | 'createdAt'>>;

/** Required fields for the very first update() call when no row exists yet. */
export type AppMetaInit = Omit<AppMeta, 'id' | 'createdAt' | 'updatedAt'>;

export const appMetaRepo = {
  async get(): Promise<AppMeta | null> {
    return (await db.appMeta.get(SINGLETON_ID)) ?? null;
  },
  async update(patch: AppMetaInit | AppMetaPatch): Promise<AppMeta> {
    const now = nowIso();
    const existing = await db.appMeta.get(SINGLETON_ID);
    if (existing) {
      const updated: AppMeta = { ...existing, ...patch, updatedAt: now };
      await db.appMeta.put(updated);
      return updated;
    }
    const init = patch as AppMetaInit;
    const created: AppMeta = {
      id: SINGLETON_ID,
      ...init,
      createdAt: now,
      updatedAt: now,
    };
    await db.appMeta.add(created);
    return created;
  },
};
