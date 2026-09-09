jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
  }

  return {
    Application: class {
      get canvas() {
        const renderer = (this as { renderer?: { canvas: unknown } }).renderer;
        if (!renderer) {
          throw new TypeError("Cannot read properties of undefined (reading 'canvas')");
        }
        return renderer.canvas;
      }
    },
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    TilingSprite: class extends MockDisplayObject {},
    EventEmitter: class {
      on() {}
      off() {}
      emit() {}
    },
  };
});

import { PixiApp } from '../pixi-app';

describe('PixiApp zoom before init', () => {
  it('zoomIn and zoomOut do not read renderer.canvas before init', () => {
    const pixiApp = new PixiApp();

    expect(() => pixiApp.zoomIn()).not.toThrow();
    expect(() => pixiApp.zoomOut()).not.toThrow();
  });

  it('resetView is a no-op before init', async () => {
    const pixiApp = new PixiApp();

    await expect(pixiApp.resetView()).resolves.toBeUndefined();
  });

  it('export before initialization returns null without accessing the canvas', async () => {
    await expect(new PixiApp().exportAsImage()).resolves.toBeNull();
  });
});
