import {
  IProtocol,
  IProtocolItem,
  IGraphPreferences,
} from '@services/observations/interface';
import {
  DEFAULT_GRAPH_COLOR,
  mergeGraphPreferences,
  resolveGraphColor,
} from '@actograph/core';

export {
  mergeGraphPreferences,
  resolveGraphColor,
  DEFAULT_GRAPH_COLOR,
} from '@actograph/core';

function getProtocolItems(protocol: IProtocol): IProtocolItem[] | null {
  if (Array.isArray(protocol._items)) {
    return protocol._items;
  }

  const protocolAny = protocol as IProtocol & { items?: IProtocolItem[] | string };
  if (Array.isArray(protocolAny.items)) {
    return protocolAny.items;
  }

  return null;
}

/**
 * Récupère les préférences graphiques d'un observable avec héritage depuis sa catégorie parente.
 */
export function getObservableGraphPreferences(
  observableId: string,
  protocol: IProtocol
): IGraphPreferences | null {
  const items = getProtocolItems(protocol);
  if (!items) {
    return null;
  }

  for (const category of items) {
    if (category.type !== 'category' || !category.children) {
      continue;
    }

    const observable = category.children.find(
      (obs) => obs.id === observableId && obs.type === 'observable'
    );

    if (observable) {
      return mergeGraphPreferences(category.graphPreferences, observable.graphPreferences);
    }
  }

  return null;
}

/**
 * Couleur effective d'une catégorie (prefs ou défaut graphe).
 */
export function resolveCategoryGraphColor(
  categoryId: string | null | undefined,
  protocol: IProtocol | null | undefined,
): string {
  if (!categoryId || !protocol) {
    return DEFAULT_GRAPH_COLOR;
  }

  const category = findProtocolItem(categoryId, protocol);
  return resolveGraphColor(category?.graphPreferences);
}

/**
 * Couleur effective d'un observable, alignée sur le graphe et la légende :
 * prefs fusionnées (catégorie → observable) avec repli sur la couleur de catégorie.
 */
export function resolveObservableChartColor(
  observableId: string,
  categoryId: string,
  protocol: IProtocol | null | undefined,
): string {
  if (!protocol) {
    return DEFAULT_GRAPH_COLOR;
  }

  const categoryColor = resolveCategoryGraphColor(categoryId, protocol);
  const preferences = getObservableGraphPreferences(observableId, protocol);
  return resolveGraphColor(preferences, categoryColor);
}

/**
 * Trouve un item (catégorie ou observable) dans le protocole par son ID.
 */
export function findProtocolItem(
  itemId: string,
  protocol: IProtocol
): IProtocolItem | null {
  const items = getProtocolItems(protocol);
  if (!items) {
    return null;
  }

  for (const category of items) {
    if (category.id === itemId) {
      return category;
    }

    if (category.children) {
      for (const observable of category.children) {
        if (observable.id === itemId) {
          return observable;
        }
      }
    }
  }

  return null;
}
