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

function resolvedMaskPauses(options: IGraphRenderOptions): boolean {
  return options.maskPauses ?? DEFAULT_GRAPH_RENDER_OPTIONS.maskPauses;
}

function resolvedTimeDisplayFormat(options: IGraphRenderOptions): TimeDisplayFormatEnum {
  return options.timeDisplayFormat ?? DEFAULT_GRAPH_RENDER_OPTIONS.timeDisplayFormat;
}

/** True when format or pause-mask actually differ (omitted fields use defaults). */
export function hasGraphRenderOptionsChanged(
  previous: IGraphRenderOptions,
  next: IGraphRenderOptions,
): boolean {
  return (
    resolvedTimeDisplayFormat(previous) !== resolvedTimeDisplayFormat(next) ||
    resolvedMaskPauses(previous) !== resolvedMaskPauses(next)
  );
}

/**
 * True when the only meaningful change is the time display format.
 * A pause-mask change still needs a world rebuild (pause overlay geometry).
 */
export function isTimeFormatOnlyChange(
  previous: IGraphRenderOptions,
  next: IGraphRenderOptions,
): boolean {
  const formatChanged =
    resolvedTimeDisplayFormat(previous) !== resolvedTimeDisplayFormat(next);
  const maskPausesChanged = resolvedMaskPauses(previous) !== resolvedMaskPauses(next);
  return formatChanged && !maskPausesChanged;
}
