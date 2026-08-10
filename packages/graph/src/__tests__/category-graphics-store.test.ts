jest.mock('pixi.js', () => {
  const destroyedGraphics: unknown[] = [];

  class MockDisplayObject {
    eventMode = 'auto';
    visible = true;
    parent: MockDisplayObject | null = null;
    children: unknown[] = [];
    addChild(child: MockDisplayObject) {
      child.parent = this;
      this.children.push(child);
      return child;
    }
    addChildAt(child: MockDisplayObject, index: number) {
      child.parent = this;
      this.children.splice(index, 0, child);
      return child;
    }
    removeChild(child: MockDisplayObject) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
      }
      if (child.parent === this) {
        child.parent = null;
      }
      return child;
    }
    destroy() {
      destroyedGraphics.push(this);
    }
    clear = jest.fn().mockReturnThis();
    rect = jest.fn().mockReturnThis();
    fill = jest.fn().mockReturnThis();
    ellipse = jest.fn().mockReturnThis();
    setFillStyle = jest.fn().mockReturnThis();
    setStrokeStyle = jest.fn().mockReturnThis();
    moveTo = jest.fn().mockReturnThis();
    lineTo = jest.fn().mockReturnThis();
    stroke = jest.fn().mockReturnThis();
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    TilingSprite: class extends MockDisplayObject {},
    __destroyedGraphics: destroyedGraphics,
  };
});

import { Application, Container } from 'pixi.js';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import type { ProtocolItem } from '../utils/protocol.utils';

const { __destroyedGraphics: destroyedGraphics } = jest.requireMock('pixi.js') as {
  __destroyedGraphics: unknown[];
};

function createMockApp(): Application {
  return {} as Application;
}

function makeCategory(id: string): ProtocolItem {
  return {
    id,
    name: id,
    type: 'category',
    children: [],
  } as ProtocolItem;
}

describe('CategoryGraphicsStore', () => {
  beforeEach(() => {
    destroyedGraphics.length = 0;
  });

  it('prunes orphan graphics and sprites', () => {
    const app = createMockApp();
    const container = new Container();
    const store = new CategoryGraphicsStore(app, container, null);

    const catA = makeCategory('a');
    const catB = makeCategory('b');
    store.getOrCreateGraphic(catA);
    store.getOrCreateGraphic(catB);

    store.pruneStaleCategoryGraphics(new Set(['a']));

    expect(store.findGraphic('a')).not.toBeNull();
    expect(store.findGraphic('b')).toBeNull();
  });

  it('destroys orphan graphics on prune', () => {
    const app = createMockApp();
    const container = new Container();
    const store = new CategoryGraphicsStore(app, container, null);

    store.getOrCreateGraphic(makeCategory('a'));
    store.getOrCreateGraphic(makeCategory('b'));

    store.pruneStaleCategoryGraphics(new Set(['a']));

    expect(destroyedGraphics.length).toBe(1);
  });

  it('destroys all graphics on clearAll', () => {
    const app = createMockApp();
    const container = new Container();
    const store = new CategoryGraphicsStore(app, container, null);

    store.getOrCreateGraphic(makeCategory('a'));
    store.getOrCreateGraphic(makeCategory('b'));

    store.clearAll();

    expect(destroyedGraphics.length).toBe(2);
    expect(store.findGraphic('a')).toBeNull();
  });
});
