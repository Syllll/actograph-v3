import { mergeDirtyFlags } from './types';
export class DirtyRegistry {
    constructor() {
        this.states = new Map();
    }
    ensure(id) {
        let state = this.states.get(id);
        if (!state) {
            state = { dirty: 'none', midDraw: false };
            this.states.set(id, state);
        }
        return state;
    }
    register(id, state) {
        const entry = this.ensure(id);
        if (state?.dirty !== undefined) {
            entry.dirty = state.dirty;
        }
        if (state?.scope !== undefined) {
            entry.scope = state.scope;
        }
        if (state?.midDraw !== undefined) {
            entry.midDraw = state.midDraw;
        }
    }
    invalidate(id, flag, scope) {
        const state = this.ensure(id);
        state.dirty = mergeDirtyFlags(state.dirty, flag);
        if (scope !== undefined) {
            state.scope = scope;
        }
    }
    isAnyDirty() {
        for (const state of this.states.values()) {
            if (state.dirty !== 'none') {
                return true;
            }
        }
        return false;
    }
    isAnyUnsafeToPaint() {
        for (const state of this.states.values()) {
            if (state.midDraw) {
                return true;
            }
        }
        return false;
    }
    markAllMidDraw() {
        for (const id of this.states.keys()) {
            this.ensure(id).midDraw = true;
        }
    }
    resetAllMidDraw() {
        for (const state of this.states.values()) {
            state.midDraw = false;
        }
    }
    invalidateAll(flag) {
        for (const id of this.states.keys()) {
            this.invalidate(id, flag);
        }
    }
    get(id) {
        return this.states.get(id);
    }
}
//# sourceMappingURL=DirtyRegistry.js.map