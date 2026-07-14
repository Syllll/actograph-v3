import type { IGraphPreferences } from '../types/protocol.types';
import { ProtocolItemActionEnum } from '../enums';

/**
 * Couleur par défaut lorsque le protocole ne définit aucune couleur.
 * Alignée sur la palette Pixi (emerald-500).
 */
export const DEFAULT_GRAPH_COLOR = '#10b981';

/** Clés meta SQLite mobile pour champs graphiques sans colonne dédiée. */
export const MOBILE_GRAPH_STROKE_WIDTH_META_KEY = 'graphStrokeWidth';
export const MOBILE_GRAPH_SUPPORT_CATEGORY_ID_META_KEY = 'graphSupportCategoryId';

/**
 * Normalise une action de protocole vers continuous/discrete.
 */
export function normalizeProtocolItemAction(
  action?: string | null,
): ProtocolItemActionEnum {
  if (!action) {
    return ProtocolItemActionEnum.Continuous;
  }

  return action.toLowerCase() === ProtocolItemActionEnum.Discrete
    ? ProtocolItemActionEnum.Discrete
    : ProtocolItemActionEnum.Continuous;
}

/** Champs héritables catégorie → observable (pas displayMode ni supportCategoryId). */
const INHERITABLE_GRAPH_PREFERENCE_KEYS = [
  'color',
  'strokeWidth',
  'backgroundPattern',
] as const;

type InheritableGraphPreferenceKey = (typeof INHERITABLE_GRAPH_PREFERENCE_KEYS)[number];

function hasDefinedGraphPreferenceValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
}

/**
 * Remplace supportCategoryId par supportCategoryName pour un export portable.
 */
export function portableizeGraphPreferencesForExport(
  preferences: IGraphPreferences | undefined,
  categoryIdToName: ReadonlyMap<string, string>,
): IGraphPreferences | undefined {
  if (!preferences) {
    return undefined;
  }

  const copy: IGraphPreferences = { ...preferences };

  if (copy.supportCategoryId) {
    const categoryName = categoryIdToName.get(copy.supportCategoryId);
    if (categoryName) {
      copy.supportCategoryName = categoryName;
    }
    delete copy.supportCategoryId;
  }

  return copy;
}

/**
 * Résout supportCategoryName vers supportCategoryId après import.
 */
export function resolvePortableGraphPreferencesOnImport(
  preferences: IGraphPreferences | undefined,
  categoryNameToId: ReadonlyMap<string, string>,
): IGraphPreferences | undefined {
  if (!preferences) {
    return undefined;
  }

  const copy: IGraphPreferences = { ...preferences };

  if (copy.supportCategoryName) {
    const categoryId = categoryNameToId.get(copy.supportCategoryName);
    if (categoryId) {
      copy.supportCategoryId = categoryId;
    }
    delete copy.supportCategoryName;
  }

  return copy;
}

/**
 * Fusionne les préférences héritables parent (catégorie) puis enfant (observable),
 * champ par champ. Les valeurs définies sur l'enfant priment sur le parent.
 *
 * displayMode et supportCategoryId ne sont pas hérités : ils restent propres à la catégorie.
 */
export function mergeGraphPreferences(
  parent?: IGraphPreferences | null,
  child?: IGraphPreferences | null,
): IGraphPreferences | null {
  const merged: IGraphPreferences = {};

  for (const key of INHERITABLE_GRAPH_PREFERENCE_KEYS) {
    const childValue = child?.[key];
    const parentValue = parent?.[key];

    if (hasDefinedGraphPreferenceValue(childValue)) {
      (merged as Record<InheritableGraphPreferenceKey, IGraphPreferences[InheritableGraphPreferenceKey]>)[key] =
        childValue as IGraphPreferences[InheritableGraphPreferenceKey];
    } else if (hasDefinedGraphPreferenceValue(parentValue)) {
      (merged as Record<InheritableGraphPreferenceKey, IGraphPreferences[InheritableGraphPreferenceKey]>)[key] =
        parentValue as IGraphPreferences[InheritableGraphPreferenceKey];
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

/**
 * Retourne la couleur effective à partir des préférences résolues.
 */
export function resolveGraphColor(
  preferences?: IGraphPreferences | null,
  fallback: string = DEFAULT_GRAPH_COLOR,
): string {
  const color = preferences?.color;
  if (typeof color === 'string' && color.trim() !== '') {
    return color;
  }
  return fallback;
}
