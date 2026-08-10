export type DirtyFlag = 'none' | 'layout' | 'data' | 'style' | 'viewport' | 'full';
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