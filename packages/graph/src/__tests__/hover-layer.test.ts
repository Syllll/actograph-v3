jest.mock('pixi.js', () => {
  class MockDisplayObject {
    visible = true;
    eventMode = 'auto';
    x = 0;
    y = 0;
    width = 40;
    height = 12;
    text = '';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
    clear = jest.fn().mockReturnThis();
    rect = jest.fn().mockReturnThis();
    fill = jest.fn().mockReturnThis();
    setStrokeStyle = jest.fn().mockReturnThis();
    moveTo = jest.fn().mockReturnThis();
    lineTo = jest.fn().mockReturnThis();
    dashedLineTo = jest.fn().mockReturnThis();
    stroke = jest.fn().mockReturnThis();
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    Text: MockDisplayObject,
  };
});

import { Application, Container } from 'pixi.js';
import { HoverLayer } from '../layers/HoverLayer';
import type { IPlotBounds } from '../utils/crosshair.utils';

function createMockApp(): Application {
  return {
    render: jest.fn(),
    renderer: {},
    canvas: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
  } as unknown as Application;
}

const plotBounds: IPlotBounds = {
  leftX: 100,
  rightX: 700,
  topY: 50,
  bottomY: 550,
};

describe('HoverLayer', () => {
  let app: Application;
  let hoverLayer: HoverLayer;
  let overlayRoot: Container;
  let requestRender: jest.Mock;

  beforeEach(() => {
    globalThis.requestAnimationFrame = jest.fn(() => 1) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = jest.fn() as typeof cancelAnimationFrame;
    app = createMockApp();
    overlayRoot = new Container();
    requestRender = jest.fn();
    hoverLayer = new HoverLayer(app, { interactive: true });
    hoverLayer.setDrawStateCallbacks({
      isDrawInProgress: () => false,
      isUnsafeToPaint: () => false,
      isExportInProgress: () => false,
      requestRender,
    });
    hoverLayer.setBoundsDeps({
      getPlotBoundsInOverlay: () => plotBounds,
      clientPointToOverlayLocal: (clientX, clientY) => ({
        x: clientX,
        y: clientY,
      }),
      getCanvas: () => app.canvas as HTMLCanvasElement,
    });
    overlayRoot.addChild(hoverLayer.container);
  });

  afterEach(() => {
    if (hoverLayer) {
      hoverLayer.destroy();
    }
  });

  it('paints crosshair inside plot bounds', () => {
    hoverLayer.updateFromWorldPointer({
      worldX: 400,
      worldY: 300,
      plotBoundsWorld: plotBounds,
      dateTime: new Date('2024-01-01T12:00:00.000Z'),
      worldToOverlay: (p) => p,
    });
    expect(requestRender).toHaveBeenCalled();
  });

  it('dismisses when pointer maps outside overlay plot bounds', () => {
    hoverLayer.updateFromWorldPointer({
      worldX: 400,
      worldY: 300,
      plotBoundsWorld: plotBounds,
      dateTime: new Date('2024-01-01T12:00:00.000Z'),
      worldToOverlay: (p) => p,
    });
    expect(requestRender).toHaveBeenCalled();

    hoverLayer.updateFromWorldPointer({
      worldX: 10,
      worldY: 300,
      plotBoundsWorld: plotBounds,
      dateTime: new Date('2024-01-01T12:00:00.000Z'),
      worldToOverlay: (p) => p,
    });
    expect(app.render).toHaveBeenCalled();
  });

  it('does not paint while suppressed', () => {
    hoverLayer.setSuppressed(true);
    hoverLayer.updateFromWorldPointer({
      worldX: 400,
      worldY: 300,
      plotBoundsWorld: plotBounds,
      dateTime: new Date('2024-01-01T12:00:00.000Z'),
      worldToOverlay: (p) => p,
    });
    expect(requestRender).not.toHaveBeenCalled();
  });

  it('requests full render instead of painting when unsafe', () => {
    hoverLayer.setDrawStateCallbacks({
      isDrawInProgress: () => false,
      isUnsafeToPaint: () => true,
      isExportInProgress: () => false,
      requestRender,
    });

    hoverLayer.updateFromWorldPointer({
      worldX: 400,
      worldY: 300,
      plotBoundsWorld: plotBounds,
      dateTime: new Date('2024-01-01T12:00:00.000Z'),
      worldToOverlay: (p) => p,
    });

    expect(requestRender).toHaveBeenCalled();
    expect(app.render).not.toHaveBeenCalled();
  });

  it('clear cancels pending rAF updates', () => {
    hoverLayer.scheduleUpdateFromWorldPointer({
      worldX: 400,
      worldY: 300,
      plotBoundsWorld: plotBounds,
      dateTime: new Date('2024-01-01T12:00:00.000Z'),
      worldToOverlay: (p) => p,
    });
    hoverLayer.clear({ cancelPending: true });
    expect(requestRender).not.toHaveBeenCalled();
  });
});
