jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    visible = true;
    children: unknown[] = [];
    addChild(child: MockDisplayObject) {
      this.children.push(child);
      return child;
    }
    addChildAt(child: unknown, index: number) {
      this.children.splice(index, 0, child);
      return child;
    }
    removeChild(child: unknown) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
      }
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
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    TilingSprite: class extends MockDisplayObject {},
  };
});

import { Application } from 'pixi.js';
import { DisplayModeEnum } from '@actograph/core';
import { SeriesLayer } from '../layers/SeriesLayer';
import { LayerDoubleBuffer } from '../layers/LayerDoubleBuffer';
import { createMockGraphContext } from './test-helpers/mock-graph-context';
import type { ProtocolItem } from '../utils/protocol.utils';

const category = {
  id: 'cat-1',
  name: 'Cat',
  type: 'category',
  children: [],
} as ProtocolItem;

describe('LayerDoubleBuffer', () => {
  it('commit swaps visible front buffer', () => {
    const buffer = new LayerDoubleBuffer();
    const marker = { id: 'marker' };
    buffer.paintBuffer.addChild(marker as never);

    buffer.commit();

    expect(buffer.displayBuffer.children).toContain(marker);
    expect(buffer.paintBuffer.children.length).toBe(0);
    expect(buffer.displayBuffer.visible).not.toBe(false);
    expect(buffer.paintBuffer.visible).toBe(false);
  });
});

describe('SeriesLayer double buffer', () => {
  it('prepare paints back; commit swaps to visible front', () => {
    const app = {} as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const rootChildren = layer.container.children as Array<{ visible: boolean }>;
    expect(rootChildren[1]?.visible).toBe(false);

    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
    });

    layer.prepare(ctx);
    layer.commit();

    const visibleBuffer = layer.container.children.find(
      (child) => (child as { visible: boolean }).visible !== false,
    ) as { children: unknown[] };
    expect(visibleBuffer).toBeDefined();
  });
});
