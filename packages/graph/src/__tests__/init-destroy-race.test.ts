jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    addChildAt(child: unknown, index: number) {
      this.children.splice(index, 0, child);
      return child;
    }
    getChildIndex() {
      return 0;
    }
    removeChild() {}
    destroy() {}
  }

  return {
    Application: class {
      stage = new MockDisplayObject();
      ticker = { stop: jest.fn() };
      renderer: { canvas: unknown } | undefined;
      initHold: Promise<void> | null = null;
      destroy = jest.fn(() => {
        this.renderer = undefined;
      });
      async init() {
        if (this.initHold) {
          await this.initHold;
        }
        this.renderer = { canvas: { getBoundingClientRect: () => ({ width: 10, height: 10 }) } };
      }
      get canvas() {
        const renderer = this.renderer;
        if (!renderer) {
          throw new TypeError("Cannot read properties of undefined (reading 'canvas')");
        }
        return renderer.canvas;
      }
    },
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    TilingSprite: class extends MockDisplayObject {},
    Text: class extends MockDisplayObject {},
    EventEmitter: class {
      on() {}
      off() {}
      emit() {}
      removeAllListeners() {}
    },
  };
});

import { PixiApp } from '../pixi-app';

function getApp(pixiApp: PixiApp): {
  initHold: Promise<void> | null;
  destroy: jest.Mock;
  renderer: unknown;
  stage: { addChild: (child: unknown) => unknown };
} {
  return (pixiApp as unknown as { app: {
    initHold: Promise<void> | null;
    destroy: jest.Mock;
    renderer: unknown;
    stage: { addChild: (child: unknown) => unknown };
  } }).app;
}

describe('PixiApp destroy during init', () => {
  it('does not resume scene construction after destroy during app.init()', async () => {
    let releaseInit: () => void = () => undefined;
    const initHold = new Promise<void>((resolve) => {
      releaseInit = resolve;
    });

    const pixiApp = new PixiApp();
    const app = getApp(pixiApp);
    app.initHold = initHold;

    const addChildSpy = jest.spyOn(app.stage, 'addChild');

    const initPromise = pixiApp.init({
      view: {
        getBoundingClientRect: () => ({ width: 400, height: 300 }),
      } as HTMLCanvasElement,
    });

    pixiApp.destroy();
    expect(app.destroy).not.toHaveBeenCalled();

    releaseInit();
    await initPromise;

    expect(app.destroy).toHaveBeenCalled();
    expect(addChildSpy).not.toHaveBeenCalled();
    expect((pixiApp as unknown as { isInitialized: boolean }).isInitialized).toBe(false);
  });

  it('destroys a renderer created after destroy() returned', async () => {
    let releaseInit: () => void = () => undefined;
    const initHold = new Promise<void>((resolve) => {
      releaseInit = resolve;
    });

    const pixiApp = new PixiApp();
    const app = getApp(pixiApp);
    app.initHold = initHold;

    const initPromise = pixiApp.init({
      view: {
        getBoundingClientRect: () => ({ width: 400, height: 300 }),
      } as HTMLCanvasElement,
    });

    pixiApp.destroy();
    releaseInit();
    await initPromise;

    expect(app.destroy).toHaveBeenCalledTimes(1);
    expect(app.renderer).toBeUndefined();
  });
});
