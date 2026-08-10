import { DisplayModeEnum } from '@actograph/core';
export function getBackgroundZoneForCategory(ctx, category, fullZoneTopY, fullZoneBottomY) {
    const supportCategoryId = category.graphPreferences?.supportCategoryId;
    if (!supportCategoryId) {
        return {
            topY: fullZoneTopY,
            height: Math.max(0, fullZoneBottomY - fullZoneTopY),
        };
    }
    const supportCategory = ctx.getCategoryById(supportCategoryId);
    if (!supportCategory) {
        return {
            topY: fullZoneTopY,
            height: Math.max(0, fullZoneBottomY - fullZoneTopY),
        };
    }
    if (supportCategory.graphPreferences?.displayMode === DisplayModeEnum.Frieze) {
        const friezeInfo = ctx.getFriezeInfo(supportCategory.id);
        if (!friezeInfo) {
            return {
                topY: fullZoneTopY,
                height: Math.max(0, fullZoneBottomY - fullZoneTopY),
            };
        }
        const top = Math.min(friezeInfo.startY, friezeInfo.endY);
        const bottom = Math.max(friezeInfo.startY, friezeInfo.endY);
        const clampedTop = Math.max(fullZoneTopY, top);
        const clampedBottom = Math.min(fullZoneBottomY, bottom);
        return {
            topY: clampedTop,
            height: Math.max(0, clampedBottom - clampedTop),
        };
    }
    const supportYPositions = (supportCategory.children || [])
        .map((observable) => ctx.getYPos(supportCategory.id, observable.name))
        .filter((pos) => pos >= 0);
    if (supportYPositions.length === 0) {
        return {
            topY: fullZoneTopY,
            height: Math.max(0, fullZoneBottomY - fullZoneTopY),
        };
    }
    const rowHalfHeight = 15;
    const top = Math.min(...supportYPositions) - rowHalfHeight;
    const bottom = Math.max(...supportYPositions) + rowHalfHeight;
    const clampedTop = Math.max(fullZoneTopY, top);
    const clampedBottom = Math.min(fullZoneBottomY, bottom);
    return {
        topY: clampedTop,
        height: Math.max(0, clampedBottom - clampedTop),
    };
}
//# sourceMappingURL=background-zone.utils.js.map