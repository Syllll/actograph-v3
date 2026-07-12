import type { IPeriod } from '@actograph/core';
import type { IGraphRenderOptions } from '../types/graph-render-options';
export interface PauseOverlayRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface PauseOverlayBounds {
    leftX: number;
    rightX: number;
    topY: number;
    bottomY: number;
}
export interface PauseOverlayStyle {
    color: number;
    alpha: number;
}
export declare const DEFAULT_PAUSE_OVERLAY_STYLE: PauseOverlayStyle;
export declare function shouldDrawPauseOverlay(maskPauses?: boolean | undefined): boolean;
export declare function resolveMaskPausesOption(options?: Partial<IGraphRenderOptions>): boolean;
/**
 * Maps pause intervals to axis-aligned rectangles clipped to the data area.
 * Pure geometry: no PixiJS dependency (testable in isolation).
 */
export declare function computePauseOverlayRects(periods: IPeriod[], bounds: PauseOverlayBounds, getXFromDate: (date: Date) => number, options?: Partial<IGraphRenderOptions>): PauseOverlayRect[];
//# sourceMappingURL=pause-overlay.utils.d.ts.map