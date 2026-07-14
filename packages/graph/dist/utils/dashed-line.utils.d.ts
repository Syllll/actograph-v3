export type DashedLineOp = {
    type: 'move';
    x: number;
    y: number;
} | {
    type: 'line';
    x: number;
    y: number;
};
/**
 * Computes draw operations for a dashed line, guaranteeing the endpoint is
 * reached with a visible stroke (avoids a gap when the dash pattern ends on
 * an off segment).
 */
export declare function computeDashedLineOps(x1: number, y1: number, x2: number, y2: number, dash?: number[]): DashedLineOp[];
//# sourceMappingURL=dashed-line.utils.d.ts.map