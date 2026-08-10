import { Container } from 'pixi.js';
export type AxisLabelKind = 'x-tick' | 'y-tick' | 'format-mention';
export type AxisLabelDescriptor = {
    id: string;
    text: string;
    /** Position monde (espace plot ; reprojetée via worldToOverlay). */
    worldX: number;
    worldY: number;
    angleDeg: number;
    anchorX: number;
    anchorY: number;
    fontSize: number;
    fontFamily: string;
    fill: string;
    fontWeight?: string;
    fontStyle?: string;
    kind: AxisLabelKind;
    /** Largeur horizontale estimée pour l'anti-collision des ticks X. */
    labelWidth?: number;
};
export interface AxisLabelOverlayProjectors {
    worldToOverlay: (p: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
}
export declare class AxisLabelOverlay {
    readonly container: Container;
    private worldToOverlay;
    private readonly labelById;
    private lastDescriptors;
    constructor();
    setProjectors(projectors: AxisLabelOverlayProjectors): void;
    sync(descriptors: AxisLabelDescriptor[]): void;
    syncPositions(): void;
    clear(): void;
    destroy(): void;
    private clearLabels;
    private applyDescriptors;
    private computeVisibleXTickIds;
    private createText;
    private updateTextContent;
}
//# sourceMappingURL=AxisLabelOverlay.d.ts.map