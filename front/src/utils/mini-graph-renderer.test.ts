import type { IObservation } from '@actograph/core';
import { MiniGraphRenderer, type MiniGraphEngine } from './mini-graph-renderer';
const deferred = () => { let resolve!: () => void; let reject!: (e: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const observation = (id = 1) => ({ id, name: 'Test', protocol: { name: 'P' }, readings: [] } as unknown as IObservation);
function setup() {
  const engine = { init: jest.fn().mockResolvedValue(undefined), setData: jest.fn(), setSelectedReadingTime: jest.fn(),
    setGraphRenderOptions: jest.fn(), setAxisStretch: jest.fn().mockResolvedValue(undefined),
    resizeFromCanvas: jest.fn(), draw: jest.fn().mockResolvedValue(undefined),
    settleInitialLayoutFit: jest.fn().mockResolvedValue(undefined), destroy: jest.fn() };
  const error = jest.fn(), ready = jest.fn();
  return { engine, error, ready, renderer: new MiniGraphRenderer(engine as MiniGraphEngine, error, ready) };
}

it('never commits a late initialization after disposal and tears down exactly once', async () => {
  const { engine, renderer, ready } = setup(); const init = deferred(); engine.init.mockReturnValue(init.promise);
  renderer.update(observation(), {}); const loading = renderer.init({} as HTMLCanvasElement);
  renderer.destroy(); renderer.destroy(); init.resolve(); await loading;
  expect(engine.destroy).toHaveBeenCalledTimes(1); expect(engine.draw).not.toHaveBeenCalled(); expect(ready).not.toHaveBeenCalled();
});

it('coalesces updates during a draw and renders only the newest snapshot afterwards', async () => {
  const { engine, renderer } = setup(); const draw = deferred(); engine.draw.mockReturnValueOnce(draw.promise);
  renderer.update(observation(1), {}); const init = renderer.init({} as HTMLCanvasElement); await tick();
  renderer.update(observation(2), {}); renderer.update(observation(3), {}); renderer.resize();
  expect(engine.draw).toHaveBeenCalledTimes(1); expect(engine.setData).toHaveBeenCalledTimes(1);
  draw.resolve(); await init; await tick();
  expect(engine.setData.mock.calls.map(call => call[0].id)).toEqual([1, 3]);
  expect(engine.resizeFromCanvas).toHaveBeenCalledTimes(1); renderer.destroy();
});

it('does not issue a second draw or ready notification after unmount during drawing', async () => {
  const { engine, renderer, ready } = setup(); const draw = deferred(); engine.draw.mockReturnValue(draw.promise);
  renderer.update(observation(), {}); const init = renderer.init({} as HTMLCanvasElement); await tick();
  renderer.update(observation(2), {}); renderer.destroy(); draw.resolve(); await init;
  expect(engine.draw).toHaveBeenCalledTimes(1); expect(ready).not.toHaveBeenCalled();
});

it('a selection update does not rebuild the data', async () => {
  const { renderer, engine } = setup(); renderer.update(observation(), {}); await renderer.init({} as HTMLCanvasElement);
  engine.setData.mockClear(); engine.draw.mockClear(); renderer.select(123); renderer.select(null);
  expect(engine.setSelectedReadingTime).toHaveBeenLastCalledWith(null);
  expect(engine.setData).not.toHaveBeenCalled(); expect(engine.draw).not.toHaveBeenCalled(); renderer.destroy();
});

it('reports a failed draw, recovers on the next update and suppresses late errors after disposal', async () => {
  const { renderer, engine, error, ready } = setup(); engine.draw.mockRejectedValueOnce(new Error('GPU'));
  renderer.update(observation(), {}); await renderer.init({} as HTMLCanvasElement);
  expect(error).toHaveBeenCalledTimes(1); renderer.update(observation(2), {}); await tick(); expect(ready).toHaveBeenCalledTimes(1);
  const draw = deferred(); engine.draw.mockReturnValueOnce(draw.promise); renderer.update(observation(3), {}); await tick();
  renderer.destroy(); draw.reject(new Error('disposed')); await tick(); expect(error).toHaveBeenCalledTimes(1);
});
