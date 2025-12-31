export { ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@actograph/core';
/**
 * Helper function to parse protocol items from JSON string
 */
export function parseProtocolItems(protocol) {
    // Si _items existe déjà (déjà parsé), les retourner
    if (protocol.items && Array.isArray(protocol.items)) {
        return protocol.items;
    }
    // Sinon essayer de parser la string items (format legacy)
    const itemsString = protocol.items;
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