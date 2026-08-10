import type { Application } from 'pixi.js';
import type { WorldBounds } from '../utils/viewport.utils';
export interface ExportPipelineDeps {
    app: Application;
    isInteractive: () => boolean;
    getRequiredCanvasHeight: () => number;
    enqueueDrawBody: () => Promise<void>;
    setViewportTransform: (transform: {
        scale?: number;
        x?: number;
        y?: number;
    }, options?: {
        emitZoom?: boolean;
        skipRender?: boolean;
    }) => void;
    updateWorldBounds: () => void;
    recalculateFitViewport: () => void;
    getWorldBounds: () => WorldBounds;
    getZoomState: () => {
        scale: number;
        minScale: number;
        maxScale: number;
    };
    getViewportTransform: () => {
        scale: number;
        x: number;
        y: number;
    };
    setHoverSuppressed: (suppressed: boolean) => void;
}
/**
 * Captures the rendered stage via renderer.extract (not app.canvas.toDataURL).
 */
export declare class ExportPipeline {
    private readonly deps;
    constructor(deps: ExportPipelineDeps);
    exportAsImage(format: 'png' | 'jpeg', quality?: number): Promise<string | null>;
}
//# sourceMappingURL=ExportPipeline.d.ts.map