export { ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@actograph/core';
/**
 * When `protocol.items` is a JSON string (API / DB shape), graph code expects `protocol._items` as an array.
 * Doing `prot._items = JSON.parse(prot.items)` on every draw mutates Vue's reactive `currentProtocol` and
 * retriggers `watch(..., { deep: true })` in the host app → infinite redraw / frozen UI.
 *
 * Hydration runs at most once per protocol object for a given `items` string value, using a WeakMap so we
 * do not add enumerable properties that participate in deep reactivity.
 */
const hydratedItemsSourceByProtocol = new WeakMap();
export function hydrateProtocolItemsFromStringIfNeeded(protocol) {
    const prot = protocol;
    if (!prot || typeof prot.items !== 'string') {
        return;
    }
    if (hydratedItemsSourceByProtocol.get(prot) === prot.items) {
        return;
    }
    try {
        const parsed = JSON.parse(prot.items);
        prot._items = Array.isArray(parsed) ? parsed : [];
    }
    catch (e) {
        console.error('Failed to parse protocol items:', e);
        prot._items = [];
    }
    hydratedItemsSourceByProtocol.set(prot, prot.items);
}
/**
 * Helper function to parse protocol items from JSON string
 */
export function parseProtocolItems(protocol) {
    // Si _items existe déjà (déjà parsé côté frontend), les retourner en priorité
    const protocolAny = protocol;
    if (Array.isArray(protocolAny._items)) {
        return protocolAny._items;
    }
    // Compatibilité: items peut déjà être un tableau selon la source
    if (Array.isArray(protocolAny.items)) {
        return protocolAny.items;
    }
    // Sinon essayer de parser la string items (format legacy)
    const itemsString = protocolAny.items;
    if (!itemsString || typeof itemsString !== 'string') {
        return [];
    }
    try {
        return JSON.parse(itemsString);
    }
    catch (e) {
        console.error('Failed to parse protocol items:', e);
        return [];
    }
}
/**
 * Récupère les préférences graphiques d'un observable avec héritage depuis sa catégorie parente.
 */
export function getObservableGraphPreferences(observableId, protocol) {
    // Utilise _items en priorité (format frontend parsé) ou items (format mobile/core)
    const prot = protocol;
    const items = prot._items || prot.items || [];
    for (const category of items) {
        if (category.type !== 'category' || !category.children) {
            continue;
        }
        const observable = category.children.find((obs) => obs.id === observableId && obs.type === 'observable');
        if (observable) {
            if (observable.graphPreferences) {
                return observable.graphPreferences;
            }
            if (category.graphPreferences) {
                return category.graphPreferences;
            }
            return null;
        }
    }
    return null;
}
//# sourceMappingURL=protocol.utils.js.map