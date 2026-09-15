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
    destroy() {}
    clear = jest.fn().mockReturnThis();
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    EventEmitter: class {
      on() {}
      off() {}
      emit() {}
    },
  };
});

import { TimeDisplayFormatEnum } from '@actograph/core';
import { PixiApp } from '../pixi-app';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';

function patchPixiApp(pixiApp: PixiApp, patch: Record<string, unknown>): void {
  Object.assign(pixiApp as unknown as Record<string, unknown>, patch);
}

function patchFormatReady(
  pixiApp: PixiApp,
  extras: Record<string, unknown> = {},
): {
  scheduleDraw: jest.SpyInstance;
  syncAxisLabelOverlay: jest.Mock;
  paint: jest.Mock;
  xAxis: { setGraphRenderOptions: jest.Mock; hasTicks: jest.Mock };
  yAxis: { hasTicks: jest.Mock };
  dataArea: { setGraphRenderOptions: jest.Mock };
  hoverLayer: { setGraphRenderOptions: jest.Mock; clear: jest.Mock };
} {
  const syncAxisLabelOverlay = jest.fn();
  const paint = jest.fn();
  const xAxis = {
    setGraphRenderOptions: jest.fn(),
    hasTicks: jest.fn(() => true),
  };
  const yAxis = {
    hasTicks: jest.fn(() => true),
  };
  const dataArea = { setGraphRenderOptions: jest.fn() };
  const hoverLayer = { setGraphRenderOptions: jest.fn(), clear: jest.fn() };
  const scheduleDraw = jest
    .spyOn(pixiApp as unknown as { scheduleDraw: (reason?: string) => void }, 'scheduleDraw')
    .mockImplementation(() => undefined);

  patchPixiApp(pixiApp, {
    isInitialized: true,
    scenePaintState: 'stable',
    drawInProgress: false,
    exportInProgress: false,
    drawFrameScheduled: false,
    graphRenderOptions: { ...DEFAULT_GRAPH_RENDER_OPTIONS },
    xAxis,
    yAxis,
    dataArea,
    hoverLayer,
    syncAxisLabelOverlay,
    paint,
    ...extras,
  });

  return {
    scheduleDraw,
    syncAxisLabelOverlay,
    paint,
    xAxis,
    yAxis,
    dataArea,
    hoverLayer,
  };
}

describe('PixiApp.setGraphRenderOptions format-only present', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('relabels overlay and paints without prepareWorld when the scene is stable', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });

    expect(mocks.xAxis.setGraphRenderOptions).toHaveBeenCalled();
    expect(mocks.dataArea.setGraphRenderOptions).toHaveBeenCalled();
    expect(mocks.hoverLayer.setGraphRenderOptions).toHaveBeenCalled();
    expect(mocks.hoverLayer.clear).toHaveBeenCalledWith({ cancelPending: true });
    expect(mocks.syncAxisLabelOverlay).toHaveBeenCalledTimes(1);
    expect(mocks.paint).toHaveBeenCalledWith('draw-complete');
    expect(mocks.scheduleDraw).not.toHaveBeenCalled();
  });

  it('does not full-rebuild on a second format change either', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });
    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinuteSecond,
    });

    expect(mocks.paint).toHaveBeenCalledTimes(2);
    expect(mocks.paint).toHaveBeenNthCalledWith(1, 'draw-complete');
    expect(mocks.paint).toHaveBeenNthCalledWith(2, 'draw-complete');
    expect(mocks.scheduleDraw).not.toHaveBeenCalled();
  });

  it('does nothing when options resolve to the same values', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.Auto,
      maskPauses: false,
    });

    expect(mocks.xAxis.setGraphRenderOptions).toHaveBeenCalled();
    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).not.toHaveBeenCalled();
  });

  it('falls back to a full draw when there are no ticks yet', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);
    mocks.xAxis.hasTicks.mockReturnValue(false);

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });

    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).toHaveBeenCalledWith('renderOptions');
  });

  it('falls back to a full draw when Y ticks are missing', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);
    mocks.yAxis.hasTicks.mockReturnValue(false);

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });

    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).toHaveBeenCalledWith('renderOptions');
  });

  it('falls back to a full draw when the scene is failed', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp, { scenePaintState: 'failed' });

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });

    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).toHaveBeenCalledWith('renderOptions');
  });

  it('schedules a full draw when maskPauses also changes', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
      maskPauses: true,
    });

    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).toHaveBeenCalledWith('renderOptions');
  });

  it('does not present overlay mid-draw (queued full draw will pick up labels)', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp, { drawInProgress: true });

    pixiApp.setGraphRenderOptions({
      timeDisplayFormat: TimeDisplayFormatEnum.HourMinute,
    });

    expect(mocks.xAxis.setGraphRenderOptions).toHaveBeenCalled();
    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).not.toHaveBeenCalled();
  });

  it('skips all drawing when redraw is false', () => {
    const pixiApp = new PixiApp();
    const mocks = patchFormatReady(pixiApp);

    pixiApp.setGraphRenderOptions(
      { timeDisplayFormat: TimeDisplayFormatEnum.HourMinute },
      { redraw: false },
    );

    expect(mocks.xAxis.setGraphRenderOptions).toHaveBeenCalled();
    expect(mocks.paint).not.toHaveBeenCalled();
    expect(mocks.scheduleDraw).not.toHaveBeenCalled();
  });
});
