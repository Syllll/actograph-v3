import {
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '../enums';
import type { IGraphPreferences } from '../types/protocol.types';
import { normalizeProtocolItemAction } from './graph-preferences';

/** Forme minimale d'une catégorie pour les règles de mode graphique. */
export interface GraphDisplayCategory {
  id: string;
  type?: string | null;
  action?: string | null;
  graphPreferences?: IGraphPreferences | null;
}

export function isValidDisplayMode(mode: unknown): mode is DisplayModeEnum {
  return (
    mode === DisplayModeEnum.Normal ||
    mode === DisplayModeEnum.Background ||
    mode === DisplayModeEnum.Frieze
  );
}

/**
 * Mode d'affichage effectif d'une catégorie.
 * Les catégories discrètes (événement) restent en Normal : leur type de données
 * n'est pas un mode de dessin arrière-plan / frise.
 */
export function getEffectiveDisplayMode(
  category: Pick<GraphDisplayCategory, 'action' | 'graphPreferences'>,
): DisplayModeEnum {
  if (normalizeProtocolItemAction(category.action) === ProtocolItemActionEnum.Discrete) {
    return DisplayModeEnum.Normal;
  }

  const mode = category.graphPreferences?.displayMode;
  return isValidDisplayMode(mode) ? mode : DisplayModeEnum.Normal;
}

export function isGraphCategoryType(type: string | null | undefined): boolean {
  if (type == null || type === '') {
    return true;
  }
  return type.toLowerCase() === ProtocolItemTypeEnum.Category;
}

/**
 * Cible possible d'un arrière-plan : continu, événement ou frise,
 * sauf la catégorie source et celles déjà en arrière-plan.
 */
export function isEligibleBackgroundSupportCategory(
  sourceCategoryId: string,
  candidate: GraphDisplayCategory,
): boolean {
  if (!candidate?.id || candidate.id === sourceCategoryId) {
    return false;
  }
  if (!isGraphCategoryType(candidate.type)) {
    return false;
  }
  return getEffectiveDisplayMode(candidate) !== DisplayModeEnum.Background;
}

export function listEligibleBackgroundSupportCategories<T extends GraphDisplayCategory>(
  sourceCategoryId: string,
  categories: readonly T[],
): T[] {
  return categories.filter((category) =>
    isEligibleBackgroundSupportCategory(sourceCategoryId, category),
  );
}

export function resolveSupportCategoryId(
  sourceCategoryId: string,
  supportCategoryId: string | null | undefined,
  categories: readonly GraphDisplayCategory[],
): string | null {
  if (!supportCategoryId) {
    return null;
  }

  const support = categories.find((category) => category.id === supportCategoryId);
  if (!support) {
    return null;
  }

  return isEligibleBackgroundSupportCategory(sourceCategoryId, support)
    ? supportCategoryId
    : null;
}
