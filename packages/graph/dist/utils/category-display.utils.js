import { DisplayModeEnum, ProtocolItemActionEnum, isCategoryVisible } from '@actograph/core';
export function getEffectiveDisplayMode(category) {
    if (category.action === ProtocolItemActionEnum.Discrete) {
        return DisplayModeEnum.Normal;
    }
    return category.graphPreferences?.displayMode ?? DisplayModeEnum.Normal;
}
export function classifyCategoriesForDraw(readingsPerCategory) {
    const background = [];
    const frieze = [];
    const normal = [];
    const hiddenCategoryIds = [];
    for (const categoryEntry of readingsPerCategory) {
        if (!isCategoryVisible(categoryEntry.category)) {
            hiddenCategoryIds.push(categoryEntry.category.id);
            continue;
        }
        const displayMode = getEffectiveDisplayMode(categoryEntry.category);
        if (displayMode === DisplayModeEnum.Background) {
            background.push(categoryEntry);
        }
        else if (displayMode === DisplayModeEnum.Frieze) {
            frieze.push(categoryEntry);
        }
        else {
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
//# sourceMappingURL=category-display.utils.js.map