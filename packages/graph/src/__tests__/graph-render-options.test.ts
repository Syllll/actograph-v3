import { TimeDisplayFormatEnum } from '@actograph/core';
import {
  DEFAULT_GRAPH_RENDER_OPTIONS,
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
