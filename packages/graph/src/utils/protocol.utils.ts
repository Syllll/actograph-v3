import type { IProtocol, IProtocolItem, IGraphPreferences } from '@actograph/core';

export { IProtocolItem as ProtocolItem };
export { ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@actograph/core';

/**
 * Helper function to parse protocol items from JSON string
 */
export function parseProtocolItems(protocol: IProtocol): IProtocolItem[] {
  // Si _items existe déjà (déjà parsé), les retourner
  if (protocol.items && Array.isArray(protocol.items)) {
    return protocol.items;
  }
  
  // Sinon essayer de parser la string items (format legacy)
  const itemsString = (protocol as any).items;
  if (!itemsString || typeof itemsString !== 'string') {
    return [];
  }

  try {
    return JSON.parse(itemsString);
  } catch (e) {
    console.error('Failed to parse protocol items:', e);
    return [];
  }
}

/**
 * Récupère les préférences graphiques d'un observable avec héritage depuis sa catégorie parente.
 */
export function getObservableGraphPreferences(
  observableId: string,
  protocol: IProtocol
): IGraphPreferences | null {
  // Utilise _items en priorité (format frontend parsé) ou items (format mobile/core)
  const prot = protocol as any;
  const items = prot._items || prot.items || [];
  
  for (const category of items) {
    if (category.type !== 'category' || !category.children) {
      continue;
    }

    const observable = category.children.find(
      (obs: IProtocolItem) => obs.id === observableId && obs.type === 'observable'
    );

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

