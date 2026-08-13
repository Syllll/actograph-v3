jest.mock('pixi.js', () => {
  class MockDisplayObject {
    visible = true;
    eventMode = 'auto';
    x = 0;
    y = 0;
    angle = 0;
    text = '';
    parent: MockDisplayObject | null = null;
    anchor = { x: 0, y: 0, set: jest.fn() };
    style: Record<string, unknown> = {};
    children: MockDisplayObject[] = [];
    addChild(child: MockDisplayObject) {
      child.parent = this;
      this.children.push(child);
      return child;
    }
    removeChild(child: MockDisplayObject) {
      this.children = this.children.filter((c) => c !== child);
      if (child.parent === this) {
        child.parent = null;
      }
      return child;
    }
    destroy() {
      this.parent?.removeChild(this);
    }
  }

  class MockText extends MockDisplayObject {
    constructor(content?: string) {
      super();
      if (content !== undefined) {
        this.text = content;
      }
    }
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Text: MockText,
  };
});

import { Container, Text } from 'pixi.js';
import { AxisLabelOverlay, type AxisLabelDescriptor } from '../layers/AxisLabelOverlay';

function makeDescriptor(
  partial: Partial<AxisLabelDescriptor> & Pick<AxisLabelDescriptor, 'id' | 'kind'>,
): AxisLabelDescriptor {
  return {
    text: partial.text ?? partial.id,
    worldX: partial.worldX ?? 0,
    worldY: partial.worldY ?? 0,
    angleDeg: partial.angleDeg ?? 0,
    anchorX: partial.anchorX ?? 0,
    anchorY: partial.anchorY ?? 0,
    fontSize: partial.fontSize ?? 12,
    fontFamily: partial.fontFamily ?? 'Arial',
    fill: partial.fill ?? 'black',
    kind: partial.kind,
    id: partial.id,
    labelWidth: partial.labelWidth,
    fontWeight: partial.fontWeight,
    fontStyle: partial.fontStyle,
  };
}

describe('AxisLabelOverlay', () => {
  let overlay: AxisLabelOverlay;
  let overlayRoot: Container;

  beforeEach(() => {
    overlayRoot = new Container();
    overlay = new AxisLabelOverlay();
    overlayRoot.addChild(overlay.container);
    overlay.setProjectors({
      worldToOverlay: (p) => ({ x: p.x * 2, y: p.y * 2 }),
    });
  });

  it('projects labels into overlay space on sync', () => {
    overlay.sync([
      makeDescriptor({
        id: 'y-1',
        kind: 'y-tick',
        worldX: 10,
        worldY: 20,
      }),
    ]);

    const text = overlay.container.children[0] as Text;
    expect(text.x).toBe(20);
    expect(text.y).toBe(40);
  });

  it('skips overlapping x-tick labels but keeps y-tick labels', () => {
    overlay.sync([
      makeDescriptor({
        id: 'x-1',
        kind: 'x-tick',
        worldX: 10,
        labelWidth: 50,
        anchorX: 0,
      }),
      makeDescriptor({
        id: 'x-2',
        kind: 'x-tick',
        worldX: 15,
        labelWidth: 50,
        anchorX: 0,
      }),
      makeDescriptor({
        id: 'y-1',
        kind: 'y-tick',
        worldX: 5,
        worldY: 10,
      }),
    ]);

    const texts = overlay.container.children as Text[];
    expect(texts.length).toBe(2);
    const visibleTexts = texts.filter((t) => t.visible);
    expect(visibleTexts.length).toBe(2);
    expect(visibleTexts.some((t) => t.text === 'x-1')).toBe(true);
    expect(visibleTexts.some((t) => t.text === 'y-1')).toBe(true);
    expect(texts.some((t) => t.text === 'x-2')).toBe(false);
  });

  it('syncPositions updates coordinates without clearing labels', () => {
    overlay.sync([
      makeDescriptor({
        id: 'y-1',
        kind: 'y-tick',
        worldX: 10,
        worldY: 20,
      }),
    ]);

    const childCountBefore = overlay.container.children.length;
    overlay.setProjectors({
      worldToOverlay: (p) => ({ x: p.x * 3, y: p.y * 3 }),
    });
    overlay.syncPositions();

    expect(overlay.container.children.length).toBe(childCountBefore);
    const text = overlay.container.children[0] as Text;
    expect(text.x).toBe(30);
    expect(text.y).toBe(60);
  });

  it('reuses label pool across successive sync calls', () => {
    const descriptors = [
      makeDescriptor({
        id: 'y-1',
        kind: 'y-tick',
        worldX: 10,
        worldY: 20,
      }),
      makeDescriptor({
        id: 'y-2',
        kind: 'y-tick',
        worldX: 10,
        worldY: 40,
      }),
    ];

    const createTextSpy = jest.spyOn(
      overlay as unknown as { createText: (descriptor: AxisLabelDescriptor) => Text },
      'createText',
    );

    for (let i = 0; i < 5; i++) {
      overlay.sync(descriptors);
    }

    expect(createTextSpy).toHaveBeenCalledTimes(2);
    expect(overlay.container.children.length).toBe(2);
    createTextSpy.mockRestore();
  });

  it('recreate option replaces pooled Text instances', () => {
    const descriptors = [
      makeDescriptor({
        id: 'y-1',
        kind: 'y-tick',
        worldX: 10,
        worldY: 20,
      }),
    ];

    overlay.sync(descriptors);
    const first = overlay.container.children[0];

    overlay.sync(descriptors, { recreate: true });

    expect(overlay.container.children.length).toBe(1);
    expect(overlay.container.children[0]).not.toBe(first);
  });

  it('syncPositions after clear does not recreate labels', () => {
    overlay.sync([
      makeDescriptor({
        id: 'y-1',
        kind: 'y-tick',
        worldX: 10,
        worldY: 20,
      }),
    ]);

    overlay.clear();
    overlay.syncPositions();

    expect(overlay.container.children.length).toBe(0);
  });

  it('clamps format-mention labels to the overlay viewport width', () => {
    overlay.setViewportSize(100);
    overlay.sync([
      makeDescriptor({
        id: 'format-mention',
        kind: 'format-mention',
        worldX: 80,
        worldY: 10,
        labelWidth: 40,
        anchorX: 0.5,
      }),
    ]);

    const text = overlay.container.children[0] as Text;
    // world 80 → overlay 160 with the *2 projector; clamp to viewport 100 - 20.
    expect(text.x).toBe(80);
  });
});
