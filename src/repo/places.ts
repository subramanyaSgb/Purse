import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Place } from '@/domain/types';

export type CreatePlaceInput = {
  name: string;
  lat: number;
  lng: number;
  addressCached?: string | null;
};

export const placesRepo = {
  async get(id: string): Promise<Place | null> {
    return (await db.places.get(id)) ?? null;
  },
  async list(): Promise<Place[]> {
    const all = await db.places.toArray();
    return all.sort((a, b) => {
      // lastUsedAt desc, nulls last; tiebreak by name asc
      if (a.lastUsedAt === b.lastUsedAt) return a.name.localeCompare(b.name);
      if (a.lastUsedAt === null) return 1;
      if (b.lastUsedAt === null) return -1;
      return b.lastUsedAt.localeCompare(a.lastUsedAt);
    });
  },
  async create(input: CreatePlaceInput): Promise<Place> {
    const p: Place = {
      id: newId(),
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      addressCached: input.addressCached ?? null,
      lastUsedAt: null,
      createdAt: nowIso(),
    };
    await db.places.add(p);
    return p;
  },
  async update(id: string, patch: Partial<Omit<Place, 'id' | 'createdAt'>>): Promise<Place> {
    const existing = await db.places.get(id);
    if (!existing) throw new Error(`Place ${id} not found`);
    const updated: Place = { ...existing, ...patch };
    await db.places.put(updated);
    return updated;
  },
  async touchLastUsed(id: string): Promise<Place> {
    return this.update(id, { lastUsedAt: nowIso() });
  },
  async remove(id: string): Promise<void> {
    const refs = await db.transactions.where('placeId').equals(id).count();
    if (refs > 0) throw new Error('Place has transactions; archive instead');
    await db.places.delete(id);
  },
};
