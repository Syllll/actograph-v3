const DIRTY_FLAG_PRIORITY = {
    none: 0,
    viewport: 1,
    style: 2,
    data: 3,
    layout: 4,
    full: 5,
};
export function mergeDirtyFlags(a, b) {
    return DIRTY_FLAG_PRIORITY[a] >= DIRTY_FLAG_PRIORITY[b] ? a : b;
}
//# sourceMappingURL=types.js.map