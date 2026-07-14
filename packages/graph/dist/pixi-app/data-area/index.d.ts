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
    private graphicForBackground;
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
    constructor(app: Application, yAxis: YAxis, xAxis: xAxis, options?: {
        interactive?: boolean;
    });
    /** Hover visuals must not steal pointer events from the plot hit area. */
    private configureHoverOverlayPassthrough;
    setPlotContainer(plotContainer: Container): void;
    /** Hides crosshair and dynamic time label (used before image export). */
    clearHoverOverlay(): void;
    /**
     * Suppresses hover UI while true so exports never capture crosshair or labels.
     */
    setHoverOverlaySuppressed(suppressed: boolean): void;
    init(): void;
    setPausePeriods(periods: IPeriod[]): void;
    setGraphRenderOptions(options: IGraphRenderOptions): void;
    setProtocol(protocol: IProtocol): void;
    setData(observation: IObservation): void;
    clear(): void;
    draw(): void;
    private drawPauseOverlay;
    private drawPointerHitArea;
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
    redrawObservable(observableId: string): void;
    private getEffectiveDisplayMode;
}
//# sourceMappingURL=index.d.ts.map