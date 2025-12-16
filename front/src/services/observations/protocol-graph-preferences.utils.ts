import { IProtocol, IProtocolItem, IGraphPreferences } from './interface';

/**
 * Récupère les préférences graphiques d'un observable avec héritage depuis sa catégorie parente.
 * 
 * Si l'observable a des préférences spécifiques, elles sont retournées.
 * Sinon, les préférences de la catégorie parente sont retournées.
 * Si aucune préférence n'est trouvée, retourne null.
 * 
 * @param observableId - ID de l'observable
 * @param protocol - Protocole contenant les items parsés
 * @returns Préférences graphiques avec héritage appliqué, ou null si aucune préférence
 */
export function getObservableGraphPreferences(
  observableId: string,
  protocol: IProtocol
): IGraphPreferences | null {
  if (!protocol._items || !Array.isArray(protocol._items)) {
    return null;
  }

  // Parcourir les catégories pour trouver l'observable
  for (const category of protocol._items) {
    if (category.type !== 'category' || !category.children) {
      continue;
    }

    // Chercher l'observable dans les enfants de la catégorie
    const observable = category.children.find(
      (obs) => obs.id === observableId && obs.type === 'observable'
    );

    if (observable) {
      // Si l'observable a des préférences, les retourner
      if (observable.graphPreferences) {
        return observable.graphPreferences;
      }

      // Sinon, retourner les préférences de la catégorie parente
      if (category.graphPreferences) {
        return category.graphPreferences;
      }

      // Aucune préférence trouvée
      return null;
    }
  }

  // Observable non trouvé
  return null;
}

/**
 * Trouve un item (catégorie ou observable) dans le protocole par son ID.
 * 
 * @param itemId - ID de l'item à trouver
 * @param protocol - Protocole contenant les items parsés
 * @returns L'item trouvé, ou null si non trouvé
 */
export function findProtocolItem(
  itemId: string,
  protocol: IProtocol
): IProtocolItem | null {
  if (!protocol._items || !Array.isArray(protocol._items)) {
    return null;
  }

  // Parcourir les catégories
  for (const category of protocol._items) {
    // Vérifier si c'est la catégorie recherchée
    if (category.id === itemId) {
      return category;
    }

    // Chercher dans les observables de la catégorie
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
