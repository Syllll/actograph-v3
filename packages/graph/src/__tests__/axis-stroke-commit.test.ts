import {
  AxisStrokeCommitState,
  graphicHasLocalGeometry,
} from '../utils/axis-stroke-commit';

describe('graphicHasLocalGeometry', () => {
  it('is true when either dimension is positive', () => {
    expect(graphicHasLocalGeometry({ getLocalBounds: () => ({ width: 2, height: 0 }) })).toBe(
      true,
    );
    expect(graphicHasLocalGeometry({ getLocalBounds: () => ({ width: 0, height: 8 }) })).toBe(
      true,
    );
  });

  it('is false for empty or non-finite bounds', () => {
    expect(graphicHasLocalGeometry({ getLocalBounds: () => ({ width: 0, height: 0 }) })).toBe(
      false,
    );
    expect(
      graphicHasLocalGeometry({ getLocalBounds: () => ({ width: Number.NaN, height: 4 }) }),
    ).toBe(false);
  });
});

describe('AxisStrokeCommitState', () => {
  it('swaps on draw flag even when paint bounds are empty', () => {
    const state = new AxisStrokeCommitState();
    const emptyPaint = { getLocalBounds: () => ({ width: 0, height: 0 }) };

    state.beginPaint();
    expect(state.hasPaintContent(emptyPaint)).toBe(false);

    state.markPaintStrokes();
    expect(state.hasPaintContent(emptyPaint)).toBe(true);

    state.commit(true);
    expect(state.hasDrawnContent()).toBe(true);
    expect(state.hasPaintContent(emptyPaint)).toBe(false);
  });

  it('keeps previous display when commit is skipped', () => {
    const state = new AxisStrokeCommitState();
    state.markPaintStrokes();
    state.commit(true);

    state.beginPaint();
    state.commit(false);
    expect(state.hasDrawnContent()).toBe(true);
  });

  it('clear drops both buffers', () => {
    const state = new AxisStrokeCommitState();
    state.markPaintStrokes();
    state.commit(true);
    state.clear();
    expect(state.hasDrawnContent()).toBe(false);
  });
});
