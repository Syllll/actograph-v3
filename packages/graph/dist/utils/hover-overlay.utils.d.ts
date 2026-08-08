import type { IPlotBounds } from './crosshair.utils';
export interface IHoverOverlayState {
    interactive: boolean;
    suppressed: boolean;
}
/** Whether hover crosshair and dynamic time label should be rendered. */
export declare function shouldRenderHoverOverlay(state: IHoverOverlayState): boolean;
/** True when (x, y) lies inside the plot rectangle (pointerDashedLines local space). */
export declare function isPointInsidePlotBounds(x: number, y: number, bounds: IPlotBounds): boolean;
//# sourceMappingURL=hover-overlay.utils.d.ts.map