export type DirtyFlag = 'none' | 'layout' | 'data' | 'style' | 'viewport' | 'full';

export type LayerId =
  | 'background'
  | 'series'
  | 'frieze'
  | 'pause'
  | 'axis'
  | 'hover';

export interface InvalidateScope {
  categoryId?: string;
}

export interface LayerRuntimeState {
  dirty: DirtyFlag;
  scope?: InvalidateScope;
  midDraw: boolean;
}

const DIRTY_FLAG_PRIORITY: Record<DirtyFlag, number> = {
  none: 0,
  viewport: 1,
  style: 2,
  data: 3,
  layout: 4,
  full: 5,
};

export function mergeDirtyFlags(a: DirtyFlag, b: DirtyFlag): DirtyFlag {
  return DIRTY_FLAG_PRIORITY[a] >= DIRTY_FLAG_PRIORITY[b] ? a : b;
}
