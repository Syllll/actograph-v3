import type { IPlotBounds } from './crosshair.utils';
/** Convertit un point world (global Pixi) vers coords locales d'un overlay screen-space. */
export declare function worldGlobalToOverlayLocal(global: {
    x: number;
    y: number;
}, overlay: {
    toLocal(p: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
}): {
    x: number;
    y: number;
};
export declare function computePlotBoundsInOverlay(args: {
    yAxisStart: {
        x: number;
        y: number;
    };
    yAxisEnd: {
        x: number;
        y: number;
    };
    xAxisEnd: {
        x: number;
        y: number;
    };
    yAxisToGlobal: (p: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
    xAxisToGlobal: (p: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
    overlayToLocal: (p: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
}): IPlotBounds | null;
//# sourceMappingURL=hover-bounds.utils.d.ts.map