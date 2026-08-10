import type { DirtyFlag, InvalidateScope, LayerId, LayerRuntimeState } from './types';
import { mergeDirtyFlags } from './types';

export class DirtyRegistry {
  private states = new Map<LayerId, LayerRuntimeState>();

  ensure(id: LayerId): LayerRuntimeState {
    let state = this.states.get(id);
    if (!state) {
      state = { dirty: 'none', midDraw: false };
      this.states.set(id, state);
    }
    return state;
  }

  register(id: LayerId, state?: Partial<LayerRuntimeState>): void {
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

  invalidate(id: LayerId, flag: DirtyFlag, scope?: InvalidateScope): void {
    const state = this.ensure(id);
    state.dirty = mergeDirtyFlags(state.dirty, flag);
    if (scope !== undefined) {
      state.scope = scope;
    }
  }

  isAnyDirty(): boolean {
    for (const state of this.states.values()) {
      if (state.dirty !== 'none') {
        return true;
      }
    }
    return false;
  }

  isAnyUnsafeToPaint(): boolean {
    for (const state of this.states.values()) {
      if (state.midDraw) {
        return true;
      }
    }
    return false;
  }

  markAllMidDraw(): void {
    for (const id of this.states.keys()) {
      this.ensure(id).midDraw = true;
    }
  }

  resetAllMidDraw(): void {
    for (const state of this.states.values()) {
      state.midDraw = false;
    }
  }

  invalidateAll(flag: DirtyFlag): void {
    for (const id of this.states.keys()) {
      this.invalidate(id, flag);
    }
  }

  get(id: LayerId): LayerRuntimeState | undefined {
    return this.states.get(id);
  }
}
