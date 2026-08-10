import { DisplayModeEnum } from '@actograph/core';
import type { ProtocolItem } from '../utils/protocol.utils';
import type { CategoryReadingsEntry } from '../engine/GraphContext';
export declare function getEffectiveDisplayMode(category: ProtocolItem): DisplayModeEnum;
export interface ClassifiedCategories {
    background: CategoryReadingsEntry[];
    frieze: CategoryReadingsEntry[];
    normal: CategoryReadingsEntry[];
    hiddenCategoryIds: string[];
}
export declare function classifyCategoriesForDraw(readingsPerCategory: ReadonlyArray<CategoryReadingsEntry>): ClassifiedCategories;
//# sourceMappingURL=category-display.utils.d.ts.map