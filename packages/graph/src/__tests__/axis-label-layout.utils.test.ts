import { selectNonOverlappingLabels } from '../utils/axis-label-layout.utils';

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
