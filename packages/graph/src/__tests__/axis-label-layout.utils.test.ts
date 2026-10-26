import { getYAxisObservableHeight } from '../lib/axis-layout.constants';
import { selectNonOverlappingLabels, rotatedLabelBounds, resolveAutomaticLabelAngle } from '../utils/axis-label-layout.utils';

describe('selectNonOverlappingLabels', () => {
  it('keeps all labels when they do not overlap', () => {
    const items = [
      { id: 'a', x: 10, width: 20, anchorX: 0 },
      { id: 'b', x: 50, width: 20, anchorX: 0 },
      { id: 'c', x: 100, width: 20, anchorX: 0 },
    ];

    const kept = selectNonOverlappingLabels(items);

    expect(kept).toEqual(new Set(['a', 'b', 'c']));
  });

  it('skips overlapping labels from left to right while considering all candidates', () => {
    const items = [
      { id: 'a', x: 10, width: 40, anchorX: 0 },
      { id: 'b', x: 30, width: 40, anchorX: 0 },
      { id: 'c', x: 80, width: 30, anchorX: 0 },
      { id: 'd', x: 95, width: 30, anchorX: 0 },
    ];

    const kept = selectNonOverlappingLabels(items, 4);

    expect(kept.has('a')).toBe(true);
    expect(kept.has('b')).toBe(false);
    expect(kept.has('c')).toBe(true);
    expect(kept.has('d')).toBe(false);
  });

  it('uses anchorX when computing horizontal extent', () => {
    const items = [
      { id: 'a', x: 50, width: 40, anchorX: 0.5 },
      { id: 'b', x: 65, width: 20, anchorX: 0 },
    ];

    const kept = selectNonOverlappingLabels(items, 0);

    expect(kept.has('a')).toBe(true);
    expect(kept.has('b')).toBe(false);
  });

  it('returns empty set for empty input', () => {
    expect(selectNonOverlappingLabels([])).toEqual(new Set());
  });
});


describe('rotated label layout', () => {
  it('extends downwards on both inclinations and uses the proper left/right anchor', () => {
    const right = rotatedLabelBounds(200, 24, 45, 0);
    const left = rotatedLabelBounds(200, 24, -45, 1);
    expect(right.bottom).toBeCloseTo(left.bottom);
    expect(left.left).toBeCloseTo(-right.right);
    expect(left.top).toBeCloseTo(0);
    expect(right.top).toBeCloseTo(0);
    const horizontal = rotatedLabelBounds(200, 24, 0, 0.5);
    expect(horizontal.left).toBeCloseTo(-100);
    expect(horizontal.right).toBeCloseTo(100);
    expect(horizontal.top).toBeCloseTo(0);
    expect(horizontal.bottom).toBeCloseTo(24);
  });

  it('chooses horizontal only when every candidate fits, before hiding collisions', () => {
    const labels = [{ id: 'a', x: 0, width: 80, anchorX: 0.5 },
      { id: 'b', x: 90, width: 80, anchorX: 0.5 }];
    expect(resolveAutomaticLabelAngle(labels)).toBe(0);
    expect(resolveAutomaticLabelAngle([...labels, { id: 'c', x: 100, width: 80, anchorX: 0.5 }])).toBe(45);
  });
});


it('scales Y row spacing with text while keeping legacy metadata at 30px', () => {
  expect(getYAxisObservableHeight(undefined)).toBe(30);
  expect(getYAxisObservableHeight(12)).toBe(30);
  expect(getYAxisObservableHeight(24)).toBe(60);
  expect(getYAxisObservableHeight(10)).toBe(25);
});
