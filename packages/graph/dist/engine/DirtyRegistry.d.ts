import type { DirtyFlag, InvalidateScope, LayerId, LayerRuntimeState } from './types';
export declare class DirtyRegistry {
    private states;
    ensure(id: LayerId): LayerRuntimeState;
    register(id: LayerId, state?: Partial<LayerRuntimeState>): void;
    invalidate(id: LayerId, flag: DirtyFlag, scope?: InvalidateScope): void;
    isAnyDirty(): boolean;
    isAnyUnsafeToPaint(): boolean;
    markAllMidDraw(): void;
    resetAllMidDraw(): void;
    invalidateAll(flag: DirtyFlag): void;
    get(id: LayerId): LayerRuntimeState | undefined;
}
//# sourceMappingURL=DirtyRegistry.d.ts.map