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
/**
 * Positions the hover time label inside the plot so it does not cover X-axis tick labels.
 */
export declare function computeHoverTimeLabelPosition(cursorX: number, cursorY: number, labelWidth: number, labelHeight: number, bounds: IPlotBounds, gap?: number): {
    x: number;
    y: number;
};
//# sourceMappingURL=crosshair.utils.d.ts.map