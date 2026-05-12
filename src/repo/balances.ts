import { db } from '@/db/db';

/**
 * balancesRepo.compute(asOf?) returns a `Map<accountId, balance>` covering
 * every account (including archived ones). Balance is computed on read \xe2\x80\x94
 * never stored \xe2\x80\x94 from:
 *
 *     openingBalance
 *   + \xce\xa3 income.amount   where accountId   = A
 *   + \xce\xa3 transfer.amount where toAccountId = A
 *   \xe2\x88\x92 \xce\xa3 expense.amount  where accountId   = A
 *   \xe2\x88\x92 \xce\xa3 transfer.amount where accountId   = A
 *
 * `asOf` (optional Date) caps the transactions considered to those with
 * `occurredAt <= asOf.toISOString()` so post-dated entries are ignored.
 */
export const balancesRepo = {
  async compute(asOf?: Date): Promise<Map<string, number>> {
    const accounts = await db.accounts.toArray();
    const map = new Map<string, number>();
    for (const a of accounts) map.set(a.id, a.openingBalance);

    const cutoff = asOf?.toISOString();
    const txs = cutoff
      ? await db.transactions.where('occurredAt').belowOrEqual(cutoff).toArray()
      : await db.transactions.toArray();

    for (const tx of txs) {
      if (tx.kind === 'expense') {
        map.set(tx.accountId, (map.get(tx.accountId) ?? 0) - tx.amount);
      } else if (tx.kind === 'income') {
        map.set(tx.accountId, (map.get(tx.accountId) ?? 0) + tx.amount);
      } else if (tx.kind === 'transfer') {
        map.set(tx.accountId, (map.get(tx.accountId) ?? 0) - tx.amount);
        if (tx.toAccountId) {
          map.set(tx.toAccountId, (map.get(tx.toAccountId) ?? 0) + tx.amount);
        }
      }
    }
    return map;
  },
};
