/** Graph-level render options, separate from category protocol preferences. */
import { TimeDisplayFormatEnum } from '@actograph/core';

export type XAxisLabelOrientation = 'auto' | 0 | 45 | -45;

export interface IGraphRenderOptions {
  maskPauses?: boolean;
  timeDisplayFormat?: TimeDisplayFormatEnum;
  timeZone?: string;
  /** Screen pixels, independent of viewport zoom. */
  xAxisFontSize?: number;
  yAxisFontSize?: number;
  xAxisLabelOrientation?: XAxisLabelOrientation;
}

export const DEFAULT_GRAPH_RENDER_OPTIONS = {
  maskPauses: false,
  timeDisplayFormat: TimeDisplayFormatEnum.Auto,
  xAxisFontSize: 12,
  yAxisFontSize: 12,
  xAxisLabelOrientation: 45 as XAxisLabelOrientation,
};

/** Invalid legacy metadata falls back to the historical 12px/+45° rendering. */
export function normalizeAxisFontSize(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(10, Math.min(24, Math.round(value)))
    : 12;
}

export function normalizeXAxisLabelOrientation(value: unknown): XAxisLabelOrientation {
  return value === 'auto' || value === 0 || value === 45 || value === -45 ? value : 45;
}

export function normalizeGraphRenderOptions(options: IGraphRenderOptions = {}): IGraphRenderOptions {
  return {
    ...options,
    maskPauses: options.maskPauses ?? false,
    timeDisplayFormat: Object.values(TimeDisplayFormatEnum).includes(options.timeDisplayFormat as TimeDisplayFormatEnum)
      ? options.timeDisplayFormat : TimeDisplayFormatEnum.Auto,
    xAxisFontSize: normalizeAxisFontSize(options.xAxisFontSize),
    yAxisFontSize: normalizeAxisFontSize(options.yAxisFontSize),
    xAxisLabelOrientation: normalizeXAxisLabelOrientation(options.xAxisLabelOrientation),
  };
}

export function hasGraphRenderOptionsChanged(previous: IGraphRenderOptions, next: IGraphRenderOptions): boolean {
  const a = normalizeGraphRenderOptions(previous);
  const b = normalizeGraphRenderOptions(next);
  return a.timeDisplayFormat !== b.timeDisplayFormat || a.maskPauses !== b.maskPauses ||
    a.timeZone !== b.timeZone || a.xAxisFontSize !== b.xAxisFontSize ||
    a.yAxisFontSize !== b.yAxisFontSize || a.xAxisLabelOrientation !== b.xAxisLabelOrientation;
}

export function isTimeFormatOnlyChange(previous: IGraphRenderOptions, next: IGraphRenderOptions): boolean {
  const a = normalizeGraphRenderOptions(previous);
  const b = normalizeGraphRenderOptions(next);
  return (a.timeDisplayFormat !== b.timeDisplayFormat || a.timeZone !== b.timeZone) &&
    a.maskPauses === b.maskPauses && a.xAxisFontSize === b.xAxisFontSize &&
    a.yAxisFontSize === b.yAxisFontSize && a.xAxisLabelOrientation === b.xAxisLabelOrientation;
}
