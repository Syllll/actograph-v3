import { pruneStaleCategoryEntries } from '../utils/category-graphics.utils';

jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
    clear = jest.fn().mockReturnThis();
    rect = jest.fn().mockReturnThis();
    fill = jest.fn().mockReturnThis();
    ellipse = jest.fn().mockReturnThis();
    setFillStyle = jest.fn().mockReturnThis();
    setStrokeStyle = jest.fn().mockReturnThis();
    moveTo = jest.fn().mockReturnThis();
    lineTo = jest.fn().mockReturnThis();
    stroke = jest.fn().mockReturnThis();
    on = jest.fn();
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    TilingSprite: class extends MockDisplayObject {},
  };
});

import { Application } from 'pixi.js';
import { DataArea } from '../pixi-app/data-area';

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

describe('DataArea.setData', () => {
  it('does not invoke categoryPruneHandler immediately', () => {
    const pruneHandler = jest.fn();
    const dataArea = new DataArea(
      {} as Application,
      {} as never,
      {} as never,
      { interactive: false },
    );
    dataArea.setCategoryPruneHandler(pruneHandler);

    dataArea.setData({
      protocol: {
        items: [
          {
            id: 'cat-1',
            name: 'Cat',
            type: 'category',
            children: [{ id: 'obs-1', name: 'On', type: 'observable' }],
          },
        ],
      },
      readings: [],
    } as never);

    expect(pruneHandler).not.toHaveBeenCalled();
  });
});
