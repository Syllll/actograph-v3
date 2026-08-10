import { Container } from 'pixi.js';
/**
 * Front/back container swap for full prepareWorld paints.
 * Public redraw paths schedule a full prepareWorld commit; no in-place display clears.
 */
export declare class LayerDoubleBuffer {
    readonly root: Container;
    private front;
    private back;
    constructor();
    get displayBuffer(): Container;
    get paintBuffer(): Container;
    swap(): void;
    clearBack(): void;
    commit(): void;
    clearPaintBuffer(): void;
    private clearContainer;
}
//# sourceMappingURL=LayerDoubleBuffer.d.ts.map