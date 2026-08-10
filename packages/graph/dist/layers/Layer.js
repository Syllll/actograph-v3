import { mergeDirtyFlags } from '../engine/types';
export class BaseLayer {
    constructor(id) {
        this.dirty = 'none';
        this.midDraw = false;
        this.id = id;
    }
    invalidate(flag, scope) {
        this.dirty = mergeDirtyFlags(this.dirty, flag);
        if (scope !== undefined) {
            this.invalidateScope = scope;
        }
    }
    isDirty() {
        return this.dirty !== 'none';
    }
    isUnsafeToPaint() {
        return this.midDraw;
    }
    markMidDraw() {
        this.midDraw = true;
    }
    resetMidDraw() {
        this.midDraw = false;
    }
    consumeDirty() {
        const flag = this.dirty;
        this.dirty = 'none';
        this.invalidateScope = undefined;
        return flag;
    }
}
//# sourceMappingURL=Layer.js.map