import { DisplayModeEnum, ProtocolItemActionEnum, isCategoryVisible } from '@actograph/core';
import type { ProtocolItem } from '../utils/protocol.utils';
import type { CategoryReadingsEntry } from '../engine/GraphContext';

export function getEffectiveDisplayMode(category: ProtocolItem): DisplayModeEnum {
  if (category.action === ProtocolItemActionEnum.Discrete) {
    return DisplayModeEnum.Normal;
  }
  return category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
}

export interface ClassifiedCategories {
  background: CategoryReadingsEntry[];
  frieze: CategoryReadingsEntry[];
  normal: CategoryReadingsEntry[];
  hiddenCategoryIds: string[];
}

export function classifyCategoriesForDraw(
  readingsPerCategory: ReadonlyArray<CategoryReadingsEntry>,
): ClassifiedCategories {
  const background: CategoryReadingsEntry[] = [];
  const frieze: CategoryReadingsEntry[] = [];
  const normal: CategoryReadingsEntry[] = [];
  const hiddenCategoryIds: string[] = [];

  for (const categoryEntry of readingsPerCategory) {
    if (!isCategoryVisible(categoryEntry.category)) {
      hiddenCategoryIds.push(categoryEntry.category.id);
      continue;
    }
    const displayMode = getEffectiveDisplayMode(categoryEntry.category);
    if (displayMode === DisplayModeEnum.Background) {
      background.push(categoryEntry);
    } else if (displayMode === DisplayModeEnum.Frieze) {
      frieze.push(categoryEntry);
    } else {
      normal.push(categoryEntry);
    }
  }

  background.sort((a, b) => {
    const aHasSupport = a.category.graphPreferences?.supportCategoryId ? 1 : 0;
    const bHasSupport = b.category.graphPreferences?.supportCategoryId ? 1 : 0;
    return aHasSupport - bHasSupport;
  });

  return { background, frieze, normal, hiddenCategoryIds };
}
