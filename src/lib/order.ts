/**
 * Sort items by a user-defined order array, with stable fallback.
 *
 * - Items whose id appears in `order` come first, in the order listed.
 * - Items whose id does NOT appear in `order` fall back to alphabetical
 *   by name. This way newly-created rows (not yet ordered by the user)
 *   land predictably at the tail without forcing a write to AppMeta
 *   every time something is created.
 * - When `order` is undefined or empty, sorts entirely by name.
 *
 * Generic over any { id, name } shape so the helper is reusable for
 * categories, payment methods, etc. should we expose reordering for
 * those later.
 */
export function sortByOrder<T extends { id: string; name: string }>(
  items: T[],
  order: readonly string[] | undefined,
): T[] {
  if (!order || order.length === 0) {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }
  const indexOf = new Map(order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = indexOf.get(a.id);
    const bi = indexOf.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Move the id at `fromIndex` to `toIndex` within `order` and return a
 * new array. Out-of-bounds indices are clamped. If `id` is absent from
 * `order` it's inserted at `toIndex` first.
 */
export function moveInOrder(
  order: readonly string[],
  id: string,
  toIndex: number,
): string[] {
  const next = [...order];
  const fromIndex = next.indexOf(id);
  if (fromIndex >= 0) {
    next.splice(fromIndex, 1);
  }
  const clamped = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clamped, 0, id);
  return next;
}
