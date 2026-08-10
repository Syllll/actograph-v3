/**
 * Returns category-bound entries whose category id is no longer active.
 */
export declare function pruneStaleCategoryEntries<T extends {
    category: {
        id: string;
    };
}>(entries: readonly T[], activeCategoryIds: ReadonlySet<string>): T[];
//# sourceMappingURL=category-graphics.utils.d.ts.map