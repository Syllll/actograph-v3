export interface IPlotBounds {
    leftX: number;
    rightX: number;
    topY: number;
    bottomY: number;
}
export interface ICrosshairSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
export interface ICrosshairSegments {
    vertical: ICrosshairSegment;
    horizontal: ICrosshairSegment;
}
/**
 * Builds full-span crosshair segments that reach both axes of the plot area.
 */
export declare function computeCrosshairSegments(cursorX: number, cursorY: number, bounds: IPlotBounds): ICrosshairSegments;
//# sourceMappingURL=crosshair.utils.d.ts.map