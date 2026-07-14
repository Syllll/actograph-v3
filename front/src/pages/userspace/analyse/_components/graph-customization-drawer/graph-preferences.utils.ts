import {
  BackgroundPatternEnum,
  DisplayModeEnum,
  IGraphPreferences,
  IProtocolItem,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@services/observations/interface';

export function isDiscreteCategory(category: IProtocolItem): boolean {
  return String(category.action) === ProtocolItemActionEnum.Discrete;
}

export function resolveCategoryDisplayMode(category: IProtocolItem): DisplayModeEnum {
  if (isDiscreteCategory(category)) {
    return DisplayModeEnum.Normal;
  }

  const mode = category.graphPreferences?.displayMode;
  if (mode && Object.values(DisplayModeEnum).includes(mode)) {
    return mode;
  }

  return DisplayModeEnum.Normal;
}

export function sanitizeGraphPreferencePatch(
  preference: Partial<IGraphPreferences>
): Partial<IGraphPreferences> {
  const patch: Partial<IGraphPreferences> = {};

  if (typeof preference.color === 'string' && preference.color.trim() !== '') {
    patch.color = preference.color;
  }
  if (typeof preference.strokeWidth === 'number' && Number.isFinite(preference.strokeWidth)) {
    patch.strokeWidth = preference.strokeWidth;
  }
  if (
    preference.backgroundPattern !== undefined &&
    Object.values(BackgroundPatternEnum).includes(preference.backgroundPattern)
  ) {
    patch.backgroundPattern = preference.backgroundPattern;
  }
  if (
    preference.displayMode !== undefined &&
    Object.values(DisplayModeEnum).includes(preference.displayMode)
  ) {
    patch.displayMode = preference.displayMode;
  }

  if (preference.supportCategoryId === '' || preference.supportCategoryId === null) {
    patch.supportCategoryId = null;
  } else if (typeof preference.supportCategoryId === 'string') {
    patch.supportCategoryId = preference.supportCategoryId;
  }

  if (patch.displayMode !== undefined && patch.displayMode !== DisplayModeEnum.Background) {
    patch.supportCategoryId = null;
  }

  return patch;
}

/** Préférences héritables par les observables (pas displayMode ni supportCategoryId). */
export function getObservablePropagationPatch(
  preference: Partial<IGraphPreferences>
): Partial<IGraphPreferences> {
  const patch: Partial<IGraphPreferences> = {};

  if (preference.color !== undefined) {
    patch.color = preference.color;
  }
  if (preference.strokeWidth !== undefined) {
    patch.strokeWidth = preference.strokeWidth;
  }
  if (preference.backgroundPattern !== undefined) {
    patch.backgroundPattern = preference.backgroundPattern;
  }

  return patch;
}

export function resolveSupportCategoryId(
  categoryId: string,
  supportCategoryId: string | null | undefined,
  categories: IProtocolItem[],
  getDisplayMode: (category: IProtocolItem) => DisplayModeEnum = resolveCategoryDisplayMode
): string | null {
  if (!supportCategoryId) {
    return null;
  }

  const isValid = categories.some(
    (category) =>
      category.id === supportCategoryId &&
      category.id !== categoryId &&
      getDisplayMode(category) !== DisplayModeEnum.Background
  );

  return isValid ? supportCategoryId : null;
}

export function isValidDisplayMode(mode: unknown): mode is DisplayModeEnum {
  return typeof mode === 'string' && Object.values(DisplayModeEnum).includes(mode as DisplayModeEnum);
}

/** Patch de correction pour une catégorie dont les prefs graphiques sont incohérentes. */
export function getCategoryPreferenceRepairPatch(
  category: IProtocolItem,
  categories: IProtocolItem[]
): Partial<IGraphPreferences> {
  const prefs = category.graphPreferences;
  if (!prefs) {
    return {};
  }

  const patch: Partial<IGraphPreferences> = {};

  if (isDiscreteCategory(category)) {
    if (prefs.displayMode !== undefined && prefs.displayMode !== DisplayModeEnum.Normal) {
      patch.displayMode = DisplayModeEnum.Normal;
    }
    if (prefs.supportCategoryId) {
      patch.supportCategoryId = null;
    }
  } else {
    if (prefs.displayMode !== undefined && !isValidDisplayMode(prefs.displayMode)) {
      patch.displayMode = DisplayModeEnum.Normal;
    }

    const effectiveMode = resolveCategoryDisplayMode(category);
    if (effectiveMode === DisplayModeEnum.Background) {
      const resolvedSupport = resolveSupportCategoryId(
        category.id,
        prefs.supportCategoryId,
        categories
      );
      if (prefs.supportCategoryId && resolvedSupport === null) {
        patch.supportCategoryId = null;
      }
    } else if (prefs.supportCategoryId) {
      patch.supportCategoryId = null;
    }
  }

  return sanitizeGraphPreferencePatch(patch);
}

export function collectCategoryPreferenceRepairs(
  categories: IProtocolItem[]
): { categoryId: string; patch: Partial<IGraphPreferences> }[] {
  return categories
    .filter((category) => category.type === ProtocolItemTypeEnum.Category)
    .map((category) => ({
      categoryId: category.id,
      patch: getCategoryPreferenceRepairPatch(category, categories),
    }))
    .filter(({ patch }) => Object.keys(patch).length > 0);
}

export function shouldApplyDisplayModeUpdate(
  category: IProtocolItem,
  nextMode: DisplayModeEnum
): boolean {
  const rawMode = category.graphPreferences?.displayMode;
  const effectiveMode = resolveCategoryDisplayMode(category);
  const hasInvalidStoredMode = rawMode !== undefined && !isValidDisplayMode(rawMode);

  if (hasInvalidStoredMode) {
    return true;
  }

  return effectiveMode !== nextMode;
}
