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

export const DEFAULT_GRAPH_RENDER_OPTIONS: Required<IGraphRenderOptions> = {
  maskPauses: false,
  timeDisplayFormat: TimeDisplayFormatEnum.Auto,
};
