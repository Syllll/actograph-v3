/**
 * Returns category-bound entries whose category id is no longer active.
 */
export function pruneStaleCategoryEntries(entries, activeCategoryIds) {
    return entries.filter((entry) => !activeCategoryIds.has(entry.category.id));
}
//# sourceMappingURL=category-graphics.utils.js.map