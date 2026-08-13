import { Application, Container } from 'pixi.js';
import { type IObservation } from '@actograph/core';
import { BaseLayer } from './Layer';
import type { GraphContext } from '../engine/GraphContext';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { type IPlotBounds } from '../utils/crosshair.utils';
export interface HoverWorldPointerInput {
    worldX: number;
    worldY: number;
    plotBoundsWorld: IPlotBounds;
    dateTime: Date;
    worldToOverlay: (p: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
}
export interface HoverLayerBoundsDeps {
    getPlotBoundsInOverlay: () => IPlotBounds | null;
    clientPointToOverlayLocal: (clientX: number, clientY: number) => {
        x: number;
        y: number;
    } | null;
    getCanvas: () => HTMLCanvasElement | null;
}
export declare class HoverLayer extends BaseLayer {
    readonly container: Container;
    private readonly app;
    private readonly pointerDashedLines;
    private readonly timeLabelContainer;
    private readonly timeLabel;
    private readonly timeLabelBackground;
    private readonly graphInteractionEnabled;
    private observation;
    private graphRenderOptions;
    private hoverOverlaySuppressed;
    private hoverOverlayVisible;
    private lastTimeLabelText;
    private pendingWorldPointer;
    private hoverRafId;
    private boundsDeps;
    private drawInProgressGate;
    private unsafeToPaintGate;
    private exportInProgressGate;
    private requestRenderCallback;
    constructor(app: Application, options?: {
        interactive?: boolean;
    });
    prepare(_ctx: GraphContext): void;
    setBoundsDeps(deps: HoverLayerBoundsDeps): void;
    setDrawStateCallbacks(callbacks: {
        isDrawInProgress: () => boolean;
        isUnsafeToPaint: () => boolean;
        isExportInProgress: () => boolean;
        requestRender: () => void;
    }): void;
    setObservation(observation: IObservation | null): void;
    setGraphRenderOptions(options: IGraphRenderOptions): void;
    init(): void;
    private configurePassthrough;
    clear(options?: {
        cancelPending?: boolean;
    }): void;
    dismiss(): void;
    setSuppressed(suppressed: boolean): void;
    syncDismissWithPointer(clientX: number, clientY: number): void;
    scheduleUpdateFromWorldPointer(input: HoverWorldPointerInput): void;
    updateFromWorldPointer(input: HoverWorldPointerInput): void;
    private paintHoverGraphics;
    destroy(): void;
    private formatHoverTimeLabel;
    private isClientPointInsidePlot;
    private paintAfterCleared;
    private cancelPendingHoverUpdate;
    private scheduleHoverUpdate;
    private onHoverRaf;
}
//# sourceMappingURL=HoverLayer.d.ts.map