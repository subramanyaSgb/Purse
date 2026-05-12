import { db } from '@/db/db';
import { newId, nowIso } from '@/lib/ids';
import type { Transaction, TxKind } from '@/domain/types';

export type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export type TxFilters = {
  accountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  tagId?: string;
  paymentMethodId?: string;
  kind?: TxKind;
  /** case-insensitive substring match against note, place name, category name */
  search?: string;
};

function validate(tx: CreateTransactionInput | Transaction): void {
  if (!(tx.amount > 0)) {
    throw new Error('Transaction amount must be positive');
  }
  if (tx.kind === 'transfer') {
    if (!tx.toAccountId) {
      throw new Error('Transfer requires toAccountId');
    }
    if (tx.accountId === tx.toAccountId) {
      throw new Error('Transfer accountId and toAccountId must not be the same');
    }
  } else {
    // expense | income
    if (!tx.categoryId) {
      throw new Error(`${tx.kind} requires categoryId`);
    }
  }
}

async function validateTags(tagIds: readonly string[]): Promise<void> {
  if (tagIds.length === 0) return;
  for (const id of tagIds) {
    const t = await db.tags.get(id);
    if (!t) throw new Error(`Tag ${id} not found`);
  }
}

/**
 * Fetch the rows in `[start, end)` ordered by occurredAt asc, using the
 * compound `[kind+occurredAt]` index when a kind filter is set and the
 * single-column `occurredAt` index otherwise. The Dexie query handles the
 * date bounds; remaining filters are applied in memory.
 */
async function rangeRows(start: string, end: string, kind?: TxKind): Promise<Transaction[]> {
  if (kind) {
    return db.transactions
      .where('[kind+occurredAt]')
      .between([kind, start], [kind, end], true, false)
      .toArray();
  }
  return db.transactions.where('occurredAt').between(start, end, true, false).toArray();
}

export const transactionsRepo = {
  async get(id: string): Promise<Transaction | null> {
    return (await db.transactions.get(id)) ?? null;
  },
  async create(input: CreateTransactionInput): Promise<Transaction> {
    validate(input);
    await validateTags(input.tagIds);
    const now = nowIso();
    const tx: Transaction = {
      ...input,
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    await db.transactions.add(tx);
    return tx;
  },
  async update(
    id: string,
    patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
  ): Promise<Transaction> {
    const existing = await db.transactions.get(id);
    if (!existing) throw new Error(`Transaction ${id} not found`);
    const merged: Transaction = { ...existing, ...patch, updatedAt: nowIso() };
    validate(merged);
    if (patch.tagIds) await validateTags(patch.tagIds);
    await db.transactions.put(merged);
    return merged;
  },
  async remove(id: string): Promise<void> {
    await db.transactions.delete(id);
  },
  /**
   * Income / expense / net summary for the range. Transfers are excluded
   * (they're a balance shuffle between the user's own accounts, not P&L).
   * Range bounds use the same inclusive-start / exclusive-end as
   * listByRange.
   */
  async summary(
    start: string,
    end: string,
  ): Promise<{
    income: number;
    expense: number;
    net: number;
    incomeCount: number;
    expenseCount: number;
  }> {
    const rows = await db.transactions
      .where('occurredAt')
      .between(start, end, true, false)
      .toArray();
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    for (const r of rows) {
      if (r.kind === 'income') {
        income += r.amount;
        incomeCount += 1;
      } else if (r.kind === 'expense') {
        expense += r.amount;
        expenseCount += 1;
      }
    }
    return { income, expense, net: income - expense, incomeCount, expenseCount };
  },
  async monthlyTotalsByCategory(
    monthISO: string /* 'YYYY-MM' */,
  ): Promise<Array<{ categoryId: string; total: number; count: number }>> {
    // Month boundary is 00:00 IST on the first day of the month, exclusive end
    // is 00:00 IST on the first day of the next month. IST is UTC+5:30, so we
    // shift the boundaries by -5:30h to get UTC instants.
    const [yStr, mStr] = monthISO.split('-');
    const y = Number(yStr);
    const m = Number(mStr); // 1-12
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      throw new Error(`Invalid monthISO: ${monthISO}`);
    }
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const startUtc = new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS).toISOString();
    const endUtc = new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS).toISOString();

    const rows = await db.transactions
      .where('occurredAt')
      .between(startUtc, endUtc, true, false)
      .toArray();

    const totals = new Map<string, { categoryId: string; total: number; count: number }>();
    for (const r of rows) {
      if (r.kind === 'transfer') continue;
      if (!r.categoryId) continue;
      const cur = totals.get(r.categoryId) ?? {
        categoryId: r.categoryId,
        total: 0,
        count: 0,
      };
      cur.total += r.amount;
      cur.count += 1;
      totals.set(r.categoryId, cur);
    }
    return Array.from(totals.values()).sort((a, b) => b.total - a.total);
  },
  async listByRange(start: string, end: string, filters: TxFilters = {}): Promise<Transaction[]> {
    const baseRows = await rangeRows(start, end, filters.kind);

    // Cheap in-memory filters first (single column equality).
    let rows = baseRows.filter((r) => {
      if (filters.accountId && r.accountId !== filters.accountId) return false;
      if (filters.categoryId && r.categoryId !== filters.categoryId) return false;
      if (filters.subcategoryId && r.subcategoryId !== filters.subcategoryId) return false;
      if (filters.paymentMethodId && r.paymentMethodId !== filters.paymentMethodId) return false;
      if (filters.tagId && !r.tagIds.includes(filters.tagId)) return false;
      return true;
    });

    // search hits note + place.name + category.name; batch-fetch the
    // referenced rows so we don't issue one get() per result.
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const placeIds = Array.from(
        new Set(rows.map((r) => r.placeId).filter((v): v is string => Boolean(v))),
      );
      const categoryIds = Array.from(
        new Set(rows.map((r) => r.categoryId).filter((v): v is string => Boolean(v))),
      );
      const [places, categories] = await Promise.all([
        placeIds.length ? db.places.bulkGet(placeIds) : Promise.resolve([]),
        categoryIds.length ? db.categories.bulkGet(categoryIds) : Promise.resolve([]),
      ]);
      const placeName = new Map<string, string>();
      for (const p of places) if (p) placeName.set(p.id, p.name.toLowerCase());
      const categoryName = new Map<string, string>();
      for (const c of categories) if (c) categoryName.set(c.id, c.name.toLowerCase());

      rows = rows.filter((r) => {
        if (r.note.toLowerCase().includes(q)) return true;
        if (r.placeId && placeName.get(r.placeId)?.includes(q)) return true;
        if (r.categoryId && categoryName.get(r.categoryId)?.includes(q)) return true;
        return false;
      });
    }

    return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  },
};
