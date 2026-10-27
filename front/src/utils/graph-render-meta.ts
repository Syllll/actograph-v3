import { getObservationTimeZone, type TimeDisplayFormatEnum } from '@actograph/core';
import {
  normalizeGraphRenderOptions,
  type IGraphRenderOptions,
  type XAxisLabelOrientation,
} from '@actograph/graph/types/graph-render-options';

/** Shared by analysis and independent mini-graph instances, without importing Pixi. */
export function graphRenderOptionsFromMeta(meta: Record<string, unknown> | null | undefined): IGraphRenderOptions {
  return normalizeGraphRenderOptions({
    timeDisplayFormat: meta?.timeDisplayFormat as TimeDisplayFormatEnum,
    timeZone: getObservationTimeZone(meta),
    xAxisFontSize: meta?.graphXAxisFontSize as number,
    yAxisFontSize: meta?.graphYAxisFontSize as number,
    xAxisLabelOrientation: meta?.graphXAxisLabelOrientation as XAxisLabelOrientation,
  });
}
