import type { GraphContext } from '../engine/GraphContext';
import type { DirtyFlag, InvalidateScope, LayerId } from '../engine/types';
import { mergeDirtyFlags } from '../engine/types';

export interface Layer {
  readonly id: LayerId;
  invalidate(flag: DirtyFlag, scope?: InvalidateScope): void;
  isDirty(): boolean;
  isUnsafeToPaint(): boolean;
  consumeDirty(): DirtyFlag;
  prepare(ctx: GraphContext): void;
}

export abstract class BaseLayer implements Layer {
  readonly id: LayerId;
  private dirty: DirtyFlag = 'none';
  protected invalidateScope: InvalidateScope | undefined;
  protected midDraw = false;

  constructor(id: LayerId) {
    this.id = id;
  }

  invalidate(flag: DirtyFlag, scope?: InvalidateScope): void {
    this.dirty = mergeDirtyFlags(this.dirty, flag);
    if (scope !== undefined) {
      this.invalidateScope = scope;
    }
  }

  isDirty(): boolean {
    return this.dirty !== 'none';
  }

  isUnsafeToPaint(): boolean {
    return this.midDraw;
  }

  markMidDraw(): void {
    this.midDraw = true;
  }

  resetMidDraw(): void {
    this.midDraw = false;
  }

  consumeDirty(): DirtyFlag {
    const flag = this.dirty;
    this.dirty = 'none';
    this.invalidateScope = undefined;
    return flag;
  }

  abstract prepare(ctx: GraphContext): void;
}
