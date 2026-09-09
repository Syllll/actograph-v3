import { worldTickLengthForStretch } from '../utils/tick-stretch.utils';

describe('worldTickLengthForStretch', () => {
  it('keeps the base length at stretch 1', () => {
    expect(worldTickLengthForStretch(10, 1)).toBe(10);
  });

  it('shortens ticks when the opposite axis is stretched', () => {
    expect(worldTickLengthForStretch(10, 2)).toBe(5);
  });

  it('lengthens ticks when the opposite axis is compacted', () => {
    expect(worldTickLengthForStretch(10, 0.5)).toBe(20);
  });

  it('falls back to 1 for invalid stretch values', () => {
    expect(worldTickLengthForStretch(10, 0)).toBe(10);
    expect(worldTickLengthForStretch(10, Number.NaN)).toBe(10);
    expect(worldTickLengthForStretch(10, -1)).toBe(10);
  });
});
