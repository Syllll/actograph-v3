import { IProtocolNodeV1 } from '../types/chronic-v1.types';
import { ValidationError } from '../../errors';
import { INormalizedProtocol, INormalizedCategory } from '../../types';
import type { IGraphPreferences } from '../../../types/protocol.types';
import { DisplayModeEnum, ProtocolItemActionEnum } from '../../../enums';

/**
 * Convertisseur pour transformer le protocole v1 en format normalisé pour v3
 * 
 * Ce convertisseur transforme la structure hiérarchique récursive du format v1
 * (arbre de nœuds avec racine, catégories et observables) en structure plate
 * du format v3 (catégories contenant des observables).
 */
export class ProtocolV1Converter {
  private buildGraphPreferencesFromNode(node: IProtocolNodeV1): IGraphPreferences | undefined {
    const prefs: IGraphPreferences = {};

    if (node.colorName && node.colorName.trim() !== '') {
      prefs.color = node.colorName;
    }

    if (node.thickness > 0) {
      prefs.strokeWidth = node.thickness;
    }

    return Object.keys(prefs).length > 0 ? prefs : undefined;
  }

  /**
   * v1 encode le type via `shape` sur le nœud :
   * - point  → ponctuel (discrete)
   * - line   → continu (continuous)
   * - background → continu + mode arrière-plan
   */
  private mapShapeToCategoryFields(node: IProtocolNodeV1): {
    action: ProtocolItemActionEnum;
    graphPreferences?: IGraphPreferences;
  } {
    const basePrefs = this.buildGraphPreferencesFromNode(node) ?? {};
    const shape = (node.shape || '').toLowerCase();

    if (shape === 'point') {
      return {
        action: ProtocolItemActionEnum.Discrete,
        graphPreferences: Object.keys(basePrefs).length > 0 ? basePrefs : undefined,
      };
    }

    if (shape === 'background' || node.isBackground) {
      return {
        action: ProtocolItemActionEnum.Continuous,
        graphPreferences: {
          ...basePrefs,
          displayMode: DisplayModeEnum.Background,
        },
      };
    }

    return {
      action: ProtocolItemActionEnum.Continuous,
      graphPreferences: Object.keys(basePrefs).length > 0 ? basePrefs : undefined,
    };
  }

  /**
   * Convertit un protocole v1 en format normalisé pour création
   */
  public convert(protocolNode: IProtocolNodeV1): INormalizedProtocol {
    if (!protocolNode) {
      throw new ValidationError('Le protocole ne peut pas être vide');
    }

    const rootNode = protocolNode;
    const protocolName = rootNode.name && rootNode.name !== 'root'
      ? rootNode.name
      : 'Protocole importé';

    const categories: INormalizedCategory[] = [];

    for (let i = 0; i < rootNode.children.length; i++) {
      const child = rootNode.children[i];

      if (child.type === 'category' || child.type === 'Category') {
        const category = this.convertCategoryNode(child, i);
        categories.push(category);
      } else if (child.type === 'observable' || child.type === 'Observable') {
        const { action, graphPreferences } = this.mapShapeToCategoryFields(child);
        const defaultCategory: INormalizedCategory = {
          name: 'Catégorie par défaut',
          description: undefined,
          order: 0,
          action,
          graphPreferences,
          observables: [this.convertObservableNode(child, 0)],
        };
        categories.push(defaultCategory);
      }
    }

    return {
      name: protocolName,
      description: undefined,
      categories: categories.length > 0 ? categories : undefined,
    };
  }

  private convertCategoryNode(
    node: IProtocolNodeV1,
    order: number,
  ): INormalizedCategory {
    const observables: INormalizedCategory['observables'] = [];

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'observable' || child.type === 'Observable') {
        observables.push(this.convertObservableNode(child, i));
      }
    }

    const { action, graphPreferences } = this.mapShapeToCategoryFields(node);

    return {
      name: node.name || `Catégorie ${order + 1}`,
      description: undefined,
      order: node.indexInParentContext >= 0 ? node.indexInParentContext : order,
      action,
      graphPreferences,
      observables: observables.length > 0 ? observables : undefined,
    };
  }

  private convertObservableNode(
    node: IProtocolNodeV1,
    order: number,
  ): NonNullable<INormalizedCategory['observables']>[0] {
    return {
      name: node.name || `Observable ${order + 1}`,
      description: undefined,
      order: node.indexInParentContext >= 0 ? node.indexInParentContext : order,
      graphPreferences: this.buildGraphPreferencesFromNode(node),
    };
  }
}

