import type { GraphContext } from '../engine/GraphContext';
import type { DirtyFlag, InvalidateScope, LayerId } from '../engine/types';
export interface Layer {
    readonly id: LayerId;
    invalidate(flag: DirtyFlag, scope?: InvalidateScope): void;
    isDirty(): boolean;
    isUnsafeToPaint(): boolean;
    consumeDirty(): DirtyFlag;
    prepare(ctx: GraphContext): void;
}
export declare abstract class BaseLayer implements Layer {
    readonly id: LayerId;
    private dirty;
    protected invalidateScope: InvalidateScope | undefined;
    protected midDraw: boolean;
    constructor(id: LayerId);
    invalidate(flag: DirtyFlag, scope?: InvalidateScope): void;
    isDirty(): boolean;
    isUnsafeToPaint(): boolean;
    markMidDraw(): void;
    resetMidDraw(): void;
    consumeDirty(): DirtyFlag;
    abstract prepare(ctx: GraphContext): void;
}
//# sourceMappingURL=Layer.d.ts.map