import { Application, Container } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import type { IObservation, IProtocol, IPeriod } from '@actograph/core';
import { YAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import type { IGraphRenderOptions } from '../../types/graph-render-options';
export declare class DataArea extends BaseGroup {
    private yAxis;
    private xAxis;
    private graphInteractionEnabled;
    private plotContainer;
    private readingsPerCategory;
    private graphicPerCategory;
    private tilingSpritesPerCategory;
    private pointerHitArea;
    private pauseOverlayGraphic;
    private pointerDashedLines;
    private timeLabelContainer;
    private timeLabel;
    private timeLabelBackground;
    private protocol;
    protected observation: IObservation | null;
    private pausePeriods;
    private graphRenderOptions;
    private hoverOverlaySuppressed;
    /** Latest raw pointermove event awaiting the next animation frame. */
    private pendingHoverEvent;
    private hoverRafId;
    private lastTimeLabelText;
    private isDrawInProgress;
    private requestRender;
    constructor(app: Application, yAxis: YAxis, xAxis: xAxis, options?: {
        interactive?: boolean;
    });
    /** Hover visuals must not steal pointer events from the plot hit area. */
    private configureHoverOverlayPassthrough;
    setPlotContainer(plotContainer: Container): void;
    /**
     * Wires PixiApp draw/render gates so hover never calls `app.render()` while
     * a full `executeDraw` (or export) is in progress.
     */
    setDrawStateCallbacks(callbacks: {
        isDrawInProgress: () => boolean;
        requestRender: () => void;
    }): void;
    /**
     * Hides crosshair and dynamic time label.
     * @param options.cancelPending - When true (default), drops any queued
     *   pointermove rAF. Pass false during a full draw so hover can resume after.
     */
    clearHoverOverlay(options?: {
        cancelPending?: boolean;
    }): void;
    /** Re-schedules hover processing after a full draw if a pointer event is pending. */
    resumeHoverAfterDraw(): void;
    /** Drops any pointermove update queued for the next animation frame. */
    private cancelPendingHoverUpdate;
    /**
     * Suppresses hover UI while true so exports never capture crosshair or labels.
     */
    setHoverOverlaySuppressed(suppressed: boolean): void;
    init(): void;
    private scheduleHoverUpdate;
    /**
     * One hover update per frame. If a full draw is in progress, keep the pending
     * event and retry next frame instead of rendering a mid-draw scene.
     */
    private onHoverRaf;
    private processPointerMove;
    setPausePeriods(periods: IPeriod[]): void;
    setGraphRenderOptions(options: IGraphRenderOptions): void;
    setProtocol(protocol: IProtocol): void;
    setData(observation: IObservation): void;
    /**
     * Removes tiling pattern sprites from the stage without clearing readings.
     * Call before clearPatternTextureCache() so destroyed textures are not still bound.
     */
    clearPatternSprites(): void;
    clear(): void;
    draw(): void;
    private drawPauseOverlay;
    private drawPointerHitArea;
    /** Keep the transparent hit area above all plot graphics for reliable hover capture. */
    private ensurePointerHitAreaOnTop;
    /** Plot bounds in the crosshair layer local space (correct axis conversion). */
    private getPlotBoundsLocal;
    /** Keep crosshair and time label above segments and pause overlays. */
    private ensureCursorUiOnTop;
    private getOrCreateGraphicForCategory;
    private drawCategoryNormal;
    private drawCategoryBackground;
    private getBackgroundZoneForCategory;
    private getCategoryById;
    private getYPosForReading;
    private clearTilingSpritesForCategory;
    private addTilingSpriteForCategory;
    private drawCategoryFrieze;
    private getObservablePreferencesForReading;
    redrawCategory(categoryId: string): void;
    redrawObservable(observableId: string): void;
    private getEffectiveDisplayMode;
}
//# sourceMappingURL=index.d.ts.map