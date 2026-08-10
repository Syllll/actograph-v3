export type DirtyFlag = 'none' | 'layout' | 'data' | 'style' | 'viewport' | 'full';
export interface DrawError {
    layerId: string;
    categoryId?: string;
    categoryName?: string;
    message: string;
}
export interface LayerPrepareOptions {
    onCategoryError?: (error: DrawError) => void;
}
export declare function toDrawErrorMessage(error: unknown): string;
export type LayerId = 'background' | 'series' | 'frieze' | 'pause' | 'axis' | 'hover';
export interface InvalidateScope {
    categoryId?: string;
}
export interface LayerRuntimeState {
    dirty: DirtyFlag;
    scope?: InvalidateScope;
    midDraw: boolean;
}
export declare function mergeDirtyFlags(a: DirtyFlag, b: DirtyFlag): DirtyFlag;
//# sourceMappingURL=types.d.ts.map