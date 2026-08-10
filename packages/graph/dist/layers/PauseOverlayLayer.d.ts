import { Application, Container } from 'pixi.js';
import type { GraphContext } from '../engine/GraphContext';
import { BaseLayer } from './Layer';
export declare class PauseOverlayLayer extends BaseLayer {
    private readonly app;
    readonly container: Container;
    private readonly pauseOverlayGraphic;
    constructor(app: Application);
    prepare(ctx: GraphContext): void;
    clear(): void;
}
//# sourceMappingURL=PauseOverlayLayer.d.ts.map