import { TimeDisplayFormatEnum } from '@actograph/core';
import {
  DEFAULT_GRAPH_RENDER_OPTIONS,
  normalizeGraphRenderOptions,
  hasGraphRenderOptionsChanged,
  isTimeFormatOnlyChange,
} from '../types/graph-render-options';

describe('hasGraphRenderOptionsChanged', () => {
  it('is false when both fields resolve to the same defaults', () => {
    expect(hasGraphRenderOptionsChanged({}, { maskPauses: false })).toBe(false);
  });

  it('is true when only the time format changes', () => {
    expect(
      hasGraphRenderOptionsChanged(
        { ...DEFAULT_GRAPH_RENDER_OPTIONS },
        {
          ...DEFAULT_GRAPH_RENDER_OPTIONS,
          timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
        },
      ),
    ).toBe(true);
  });

  it('is true when only maskPauses changes', () => {
    expect(
      hasGraphRenderOptionsChanged(
        { maskPauses: false },
        { maskPauses: true },
      ),
    ).toBe(true);
  });

  it('treats a calendar timezone change as a label-only change', () => {
    expect(hasGraphRenderOptionsChanged(
      { timeZone: 'Europe/Paris' },
      { timeZone: 'America/Toronto' },
    )).toBe(true);
    expect(isTimeFormatOnlyChange(
      { timeZone: 'Europe/Paris' },
      { timeZone: 'America/Toronto' },
    )).toBe(true);
  });
});

describe('isTimeFormatOnlyChange', () => {
  it('is true when only the time format changes', () => {
    expect(
      isTimeFormatOnlyChange(
        { ...DEFAULT_GRAPH_RENDER_OPTIONS },
        {
          ...DEFAULT_GRAPH_RENDER_OPTIONS,
          timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
        },
      ),
    ).toBe(true);
  });

  it('is false when the format is unchanged', () => {
    expect(
      isTimeFormatOnlyChange(
        { timeDisplayFormat: TimeDisplayFormatEnum.HourMinute },
        { timeDisplayFormat: TimeDisplayFormatEnum.HourMinute },
      ),
    ).toBe(false);
  });

  it('is false when maskPauses also changes', () => {
    expect(
      isTimeFormatOnlyChange(
        { timeDisplayFormat: TimeDisplayFormatEnum.Auto, maskPauses: false },
        {
          timeDisplayFormat: TimeDisplayFormatEnum.HourMinuteSecond,
          maskPauses: true,
        },
      ),
    ).toBe(false);
  });

  it('treats omitted maskPauses as the default (false)', () => {
    expect(
      isTimeFormatOnlyChange(
        { timeDisplayFormat: TimeDisplayFormatEnum.Auto },
        { timeDisplayFormat: TimeDisplayFormatEnum.HourMinute, maskPauses: false },
      ),
    ).toBe(true);
  });
});


describe('axis render options', () => {
  it('preserves historical defaults and normalizes corrupt or out-of-range values', () => {
    expect(normalizeGraphRenderOptions({})).toMatchObject({
      xAxisFontSize: 12, yAxisFontSize: 12, xAxisLabelOrientation: 45,
    });
    expect(normalizeGraphRenderOptions({ xAxisFontSize: 100, yAxisFontSize: NaN,
      xAxisLabelOrientation: 90 as never })).toMatchObject({
      xAxisFontSize: 24, yAxisFontSize: 12, xAxisLabelOrientation: 45,
    });
    expect(normalizeGraphRenderOptions({ xAxisFontSize: 2, yAxisFontSize: 18.4,
      xAxisLabelOrientation: 'auto' })).toMatchObject({
      xAxisFontSize: 10, yAxisFontSize: 18, xAxisLabelOrientation: 'auto',
    });
  });

  it.each([
    { xAxisFontSize: 24 }, { yAxisFontSize: 20 }, { xAxisLabelOrientation: -45 as const },
    { xAxisLabelOrientation: 'auto' as const },
  ])('rebuilds axis geometry for %p, even together with a time-format change', (options) => {
    expect(hasGraphRenderOptionsChanged({}, options)).toBe(true);
    expect(isTimeFormatOnlyChange({}, { ...options,
      timeDisplayFormat: TimeDisplayFormatEnum.Full })).toBe(false);
  });
});
