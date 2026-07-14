/**
 * Graph-level render options (not per-category protocol preferences).
 */
export interface IGraphRenderOptions {
  /** When true, pauses are hidden: no overlay is drawn on pause intervals. When false (default), a semi-transparent overlay reveals them. */
  maskPauses?: boolean;
}

export const DEFAULT_GRAPH_RENDER_OPTIONS: Required<IGraphRenderOptions> = {
  maskPauses: false,
};
