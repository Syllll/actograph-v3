import { pruneStaleCategoryEntries } from '../utils/category-graphics.utils';

describe('pruneStaleCategoryEntries', () => {
  it('returns entries whose category id is not in the active set', () => {
    const entries = [
      { category: { id: 'a' }, value: 1 },
      { category: { id: 'b' }, value: 2 },
      { category: { id: 'c' }, value: 3 },
    ];
    const activeIds = new Set(['a', 'c']);

    const orphans = pruneStaleCategoryEntries(entries, activeIds);

    expect(orphans).toEqual([{ category: { id: 'b' }, value: 2 }]);
  });

  it('returns an empty array when every entry is active', () => {
    const entries = [
      { category: { id: 'x' } },
      { category: { id: 'y' } },
    ];
    const activeIds = new Set(['x', 'y']);

    expect(pruneStaleCategoryEntries(entries, activeIds)).toEqual([]);
  });

  it('returns all entries when the active set is empty', () => {
    const entries = [{ category: { id: 'only' } }];

    expect(pruneStaleCategoryEntries(entries, new Set())).toEqual(entries);
  });
});
