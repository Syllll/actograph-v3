jest.mock('pixi.js', () => {
  class MockGraphics {
    eventMode = 'auto';
    clear = jest.fn().mockReturnThis();
    moveTo = jest.fn().mockReturnThis();
    lineTo = jest.fn().mockReturnThis();
    stroke = jest.fn().mockReturnThis();
  }
  return { Application: class {}, Container: class {}, Graphics: MockGraphics,
    EventEmitter: class { on() {} off() {} emit() {} } };
});
import { PixiApp } from '../pixi-app';

type Internals = {
  syncSelectedReadingMarker(committingWorld?: boolean): void;
  selectedReadingMarker: { clear: jest.Mock; moveTo: jest.Mock; lineTo: jest.Mock; stroke: jest.Mock };
};
function setup() {
  const engine = new PixiApp();
  const requestRender = jest.spyOn(engine, 'requestRender').mockImplementation(() => undefined);
  Object.assign(engine, {
    hasCommittedWorld: true, lastObservation: {}, app: { screen: { width: 500, height: 300 } },
    overlayRoot: { toLocal: (point: unknown) => point, addChild: jest.fn() },
    xAxis: { getPosFromDateTime: (date: Date) => +date, toGlobal: (point: unknown) => point },
    getPlotBoundsInOverlay: () => ({ leftX: 50, rightX: 450, topY: 20, bottomY: 270 }),
  });
  return { engine, requestRender, internal: engine as unknown as Internals };
}
it('projects a selected reading into a two-pixel vertical screen-space line', () => {
  const { engine, internal, requestRender } = setup(); engine.setSelectedReadingTime(150); internal.syncSelectedReadingMarker();
  expect(requestRender).toHaveBeenCalledTimes(1);
  expect(internal.selectedReadingMarker.moveTo).toHaveBeenCalledWith(150, 20);
  expect(internal.selectedReadingMarker.lineTo).toHaveBeenCalledWith(150, 270);
  expect(internal.selectedReadingMarker.stroke).toHaveBeenCalledWith({ color: '#d33b68', width: 2 });
});
it('clears the marker with no selection, invalid time or a time outside the plot', () => {
  const { engine, internal } = setup(); engine.setSelectedReadingTime(150); internal.syncSelectedReadingMarker();
  const marker = internal.selectedReadingMarker; marker.moveTo.mockClear();
  for (const time of [null, NaN, 500]) { engine.setSelectedReadingTime(time); internal.syncSelectedReadingMarker(); }
  expect(marker.moveTo).not.toHaveBeenCalled(); expect(marker.clear).toHaveBeenCalledTimes(4);
});

it('shows the marker on the first authoritative paint before the world is flagged committed', () => {
  const { engine, internal } = setup();
  Object.assign(engine, { hasCommittedWorld: false });
  engine.setSelectedReadingTime(150);
  internal.syncSelectedReadingMarker(true);
  expect(internal.selectedReadingMarker.moveTo).toHaveBeenCalledWith(150, 20);
});

it('reserves screen pixels for labels only for the mini graph, shared by fit and pan clamps', () => {
  const { engine } = setup();
  const inner = engine as unknown as { getCanvasSize(): { width: number; height: number } };
  Object.assign(engine, { xAxis: { getRequiredBottomMargin: () => 90 } });
  expect(inner.getCanvasSize()).toEqual({ width: 500, height: 300 });
  Object.assign(engine, { reserveAxisLabelSpace: true });
  expect(inner.getCanvasSize()).toEqual({ width: 410, height: 210 });
});

it('fits the mini graph with persisted axis stretch included', () => {
  const { engine } = setup();
  Object.assign(engine, { reserveAxisLabelSpace: true,
    xAxis: { getRequiredBottomMargin: () => 90 }, worldBounds: { width: 1000, height: 600 },
    axisStretch: { x: 2, y: 0.5 }, zoomState: { minScale: 0.1, maxScale: 5 } });
  const internal = engine as unknown as { recalculateFitViewport(): void; fitViewport: { scaleX: number; x: number; y: number } };
  internal.recalculateFitViewport();
  expect(internal.fitViewport.scaleX).toBeCloseTo(0.205);
  expect(internal.fitViewport.x).toBe(0);
  expect(internal.fitViewport.y).toBeCloseTo(74.25);
});

it.each([false, true])('fits custom axes for analysis and mini graph (reserve=%s), preserving an explicit zoom', reserve => {
  const { engine } = setup();
  const descriptor = { id: 'origin', kind: 'x-tick', text: '26.10.2026 09:00:00:000',
    worldX: 80, worldY: 77, fontSize: 24, fontFamily: 'Arial', fill: 'black',
    labelWidth: 267, angleDeg: -45, anchorX: 1, anchorY: 0 };
  Object.assign(engine, { reserveAxisLabelSpace: reserve,
    app: { screen: { width: 800, height: 400 } },
    xAxis: { getLabelDescriptors: () => [descriptor] }, yAxis: { getLabelDescriptors: () => [] },
    graphRenderOptions: { xAxisFontSize: 24, yAxisFontSize: 12, xAxisLabelOrientation: -45 },
    worldBounds: { width: 740, height: 85 }, axisStretch: { x: 1, y: 1 },
    zoomState: { scale: 2, minScale: 0.1, maxScale: 5 },
    viewport: { scale: { set: jest.fn() }, x: 0, y: 0 },
    updateWorldTransforms: jest.fn(), hoverLayer: { clear: jest.fn() },
  });
  const internal = engine as unknown as { recalculateFitViewport(): void;
    fitViewport: { scaleX: number; x: number; y: number };
    setViewportTransform(transform: { scale: number; x: number; y: number }, options: unknown): void };
  internal.recalculateFitViewport();
  expect(internal.fitViewport.scaleX).toBeLessThan(1);
  expect(internal.fitViewport.x).toBeGreaterThan(100);
  internal.setViewportTransform({ scale: 2, x: 0, y: 0 },
    { emitZoom: false, skipRender: true, skipLabelRefresh: true });
  expect(engine.getZoomLevel()).toBe(2);
});
