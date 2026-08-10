import { PatternTextureStore } from '../gpu/PatternTextureStore';
const boundStores = new Set();
let legacyStore = null;
let legacyWarningShown = false;
function getOrCreateLegacyStore() {
    if (!legacyStore) {
        if (!legacyWarningShown) {
            console.warn('[@actograph/graph] Using legacy module-scoped PatternTextureStore. '
                + 'Bind a per-instance store via bindPatternTextureStore() when GraphEngine is wired.');
            legacyWarningShown = true;
        }
        legacyStore = new PatternTextureStore();
    }
    return legacyStore;
}
function resolveCompatStore() {
    if (boundStores.size === 1) {
        return boundStores.values().next().value;
    }
    return getOrCreateLegacyStore();
}
/**
 * @deprecated Use a per-instance PatternTextureStore from GraphEngine instead.
 */
export function getDefaultPatternTextureStore() {
    return getOrCreateLegacyStore();
}
/**
 * @deprecated Use bindPatternTextureStore() instead.
 */
export function setPatternTextureStoreForCompat(store) {
    legacyStore = store;
}
export function bindPatternTextureStore(store) {
    boundStores.add(store);
}
export function unbindPatternTextureStore(store) {
    boundStores.delete(store);
}
/**
 * @deprecated Use PatternTextureStore.acquire() on a per-instance store instead.
 */
export function createPatternTexture(_app, pattern, color) {
    return resolveCompatStore().acquire(pattern, color);
}
/**
 * @deprecated Use PatternTextureStore.createTilingSprite() on a per-instance store instead.
 */
export function createTilingPatternSprite(pattern, color, x, y, width, height) {
    return resolveCompatStore().createTilingSprite(pattern, color, x, y, width, height);
}
/**
 * @deprecated Use PatternTextureStore.evict() on a per-instance store instead.
 */
export function clearPatternTextureCache() {
    if (boundStores.size === 1) {
        boundStores.values().next().value?.evict();
        return;
    }
    if (boundStores.size > 1) {
        for (const store of boundStores) {
            store.evict();
        }
        return;
    }
    getOrCreateLegacyStore().evict();
}
//# sourceMappingURL=pattern-textures.js.map