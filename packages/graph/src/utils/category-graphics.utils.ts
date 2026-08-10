/**
 * Returns category-bound entries whose category id is no longer active.
 */
export function pruneStaleCategoryEntries<T extends { category: { id: string } }>(
  entries: readonly T[],
  activeCategoryIds: ReadonlySet<string>,
): T[] {
  return entries.filter((entry) => !activeCategoryIds.has(entry.category.id));
}
