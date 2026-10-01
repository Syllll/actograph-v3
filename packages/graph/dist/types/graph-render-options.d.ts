/**
 * Graph-level render options (not per-category protocol preferences).
 */
import { TimeDisplayFormatEnum } from '@actograph/core';
export interface IGraphRenderOptions {
    /** When true, pauses are hidden: no overlay is drawn on pause intervals. When false (default), a fully opaque overlay reveals them. */
    maskPauses?: boolean;
    /** Format d'affichage du temps sur l'axe X et le label de survol. 'auto' (défaut) reproduit le comportement historique adaptatif. */
    timeDisplayFormat?: TimeDisplayFormatEnum;
}
export declare const DEFAULT_GRAPH_RENDER_OPTIONS: Required<IGraphRenderOptions>;
/** True when format or pause-mask actually differ (omitted fields use defaults). */
export declare function hasGraphRenderOptionsChanged(previous: IGraphRenderOptions, next: IGraphRenderOptions): boolean;
/**
 * True when the only meaningful change is the time display format.
 * A pause-mask change still needs a world rebuild (pause overlay geometry).
 */
export declare function isTimeFormatOnlyChange(previous: IGraphRenderOptions, next: IGraphRenderOptions): boolean;
//# sourceMappingURL=graph-render-options.d.ts.map