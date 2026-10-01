/**
 * Double-buffer commit for axis *strokes* (Graphics in the viewport).
 *
 * Pixi can report empty `getLocalBounds()` on an invisible paint Graphic
 * until that Graphic has been presented. Series layers always swap; axes
 * used to skip the swap in that case, leaving data visible and axis lines
 * missing. The paint-stroke flag is set by `draw()`, independent of bounds.
 */
export declare function graphicHasLocalGeometry(graphic: {
    getLocalBounds(): {
        width: number;
        height: number;
    };
}): boolean;
export declare class AxisStrokeCommitState {
    private paintHasStrokes;
    private displayHasStrokes;
    beginPaint(): void;
    markPaintStrokes(): void;
    hasPaintContent(paintGraphic: {
        getLocalBounds(): {
            width: number;
            height: number;
        };
    }): boolean;
    /** Call after a swap (true) or a refused swap that kept the previous display. */
    commit(didSwap: boolean): void;
    hasDrawnContent(): boolean;
    clear(): void;
}
//# sourceMappingURL=axis-stroke-commit.d.ts.map