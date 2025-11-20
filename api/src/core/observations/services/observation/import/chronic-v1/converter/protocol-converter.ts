import { IProtocolNodeV1 } from '../types/chronic-v1.types';
import { BadRequestException } from '@nestjs/common';

/**
 * Format normalisé pour la création d'un protocole
 */
export interface NormalizedProtocol {
  name: string;
  description?: string;
  categories: Array<{
    name: string;
    description?: string;
    order?: number;
    observables?: Array<{
      name: string;
      description?: string;
      order?: number;
    }>;
  }>;
}

/**
 * Convertisseur pour transformer le protocole v1 en format normalisé pour v3
 * 
 * Ce convertisseur transforme la structure hiérarchique récursive du format v1
 * (arbre de nœuds avec racine, catégories et observables) en structure plate
 * du format v3 (catégories contenant des observables).
 * 
 * Transformations effectuées :
 * - Nœud racine : Ignoré (pas de correspondance dans v3)
 * - Nœuds 'category' : Convertis en catégories
 * - Nœuds 'observable' : Convertis en observables dans leur catégorie parente
 * - Ordre : Préservé via indexInParentContext
 * - Métadonnées d'affichage (positions, couleurs, formes) : Ignorées (non utilisées dans v3)
 * 
 * @see NormalizedProtocol - Format de sortie normalisé
 */
export class ProtocolV1Converter {
  /**
   * Convertit un protocole v1 en format normalisé pour création
   * 
   * Structure v1 : Arbre récursif avec nœud racine
   * Structure v3 : Structure plate avec catégories contenant des observables
   * 
   * Exemple de conversion :
   * v1: root -> category1 -> observable1, observable2
   * v3: category1 -> observables: [observable1, observable2]
   * 
   * @param protocolNode Nœud racine du protocole v1
   * @returns Format normalisé avec categories/observables
   */
  public convert(protocolNode: IProtocolNodeV1): NormalizedProtocol {
    if (!protocolNode) {
      throw new BadRequestException('Le protocole ne peut pas être vide');
    }

    // Identifier le nœud racine
    let rootNode = protocolNode;
    if (!protocolNode.isRootNode) {
      // Si le nœud passé n'est pas la racine, on cherche la racine
      // Pour l'instant, on assume que le nœud passé est la racine
      // Si nécessaire, on peut ajouter une logique de recherche
    }

    // Extraire le nom du protocole depuis le nœud racine ou utiliser une valeur par défaut
    const protocolName = rootNode.name && rootNode.name !== 'root'
      ? rootNode.name
      : 'Protocole importé';

    // Parcourir récursivement les enfants du nœud racine
    const categories: NormalizedProtocol['categories'] = [];

    for (let i = 0; i < rootNode.children.length; i++) {
      const child = rootNode.children[i];

      // Les nœuds de type 'category' deviennent des catégories
      if (child.type === 'category' || child.type === 'Category') {
        const category = this.convertCategoryNode(child, i);
        categories.push(category);
      } else if (child.type === 'observable' || child.type === 'Observable') {
        // Si un observable est directement sous la racine, on crée une catégorie par défaut
        const defaultCategory = {
          name: 'Catégorie par défaut',
          description: undefined,
          order: 0,
          observables: [this.convertObservableNode(child, 0)],
        };
        categories.push(defaultCategory);
      }
      // Les autres types sont ignorés
    }

    return {
      name: protocolName,
      description: undefined, // Le format v1 n'a pas de description au niveau protocole
      categories,
    };
  }

  /**
   * Convertit un nœud de catégorie v1 en catégorie normalisée
   * @param node Nœud de catégorie v1
   * @param order Ordre dans la liste
   * @returns Catégorie normalisée
   */
  private convertCategoryNode(
    node: IProtocolNodeV1,
    order: number,
  ): NormalizedProtocol['categories'][0] {
    const observables: Array<{
      name: string;
      description?: string;
      order?: number;
    }> = [];

    // Parcourir les enfants de la catégorie
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      // Les enfants de type 'observable' deviennent des observables
      if (child.type === 'observable' || child.type === 'Observable') {
        observables.push(this.convertObservableNode(child, i));
      }
      // Les autres types sont ignorés
    }

    return {
      name: node.name || `Catégorie ${order + 1}`,
      description: undefined, // Le format v1 n'a pas de description
      order: node.indexInParentContext >= 0 ? node.indexInParentContext : order,
      observables: observables.length > 0 ? observables : undefined,
    };
  }

  /**
   * Convertit un nœud d'observable v1 en observable normalisé
   * @param node Nœud d'observable v1
   * @param order Ordre dans la liste
   * @returns Observable normalisé
   */
  private convertObservableNode(
    node: IProtocolNodeV1,
    order: number,
  ): {
    name: string;
    description?: string;
    order?: number;
  } {
    return {
      name: node.name || `Observable ${order + 1}`,
      description: undefined, // Le format v1 n'a pas de description
      order: node.indexInParentContext >= 0 ? node.indexInParentContext : order,
    };
  }
}

