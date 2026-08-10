import { Container } from 'pixi.js';
/**
 * Front/back container swap for full prepareWorld paints.
 * Partial redrawCategory updates the visible display buffer in place.
 */
export declare class LayerDoubleBuffer {
    readonly root: Container;
    private front;
    private back;
    constructor();
    get displayBuffer(): Container;
    get paintBuffer(): Container;
    commit(): void;
    clearPaintBuffer(): void;
    private clearContainer;
}
//# sourceMappingURL=LayerDoubleBuffer.d.ts.map