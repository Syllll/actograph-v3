/** @jest-environment jsdom */
import { clampMiniGraphRect, readMiniGraphRect, saveMiniGraphRect, MINI_GRAPH_STORAGE_KEY } from './mini-graph-geometry';
afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });
it.each([{ width: 1920, height: 1080 }, { width: 640, height: 480 }, { width: 300, height: 200 }])('keeps the whole panel inside %p', screen => {
  const rect = clampMiniGraphRect({ x: 9000, y: -500, width: 8000, height: 8000 }, screen);
  expect(rect.x).toBeGreaterThanOrEqual(8); expect(rect.y).toBeGreaterThanOrEqual(8);
  expect(rect.x + rect.width).toBeLessThanOrEqual(screen.width - 8);
  expect(rect.y + rect.height).toBeLessThanOrEqual(screen.height - 8);
});
it.each(['invalid', 'null', '4', '{"x":null,"width":"huge","height":-1}'])('restores safely from %s', text => {
  localStorage.setItem(MINI_GRAPH_STORAGE_KEY, text); const rect = readMiniGraphRect({ width: 1200, height: 800 });
  expect(Number.isFinite(rect.x)).toBe(true); expect(rect.width).toBeGreaterThanOrEqual(340); expect(rect.height).toBeGreaterThanOrEqual(220);
});
it('tolerates unavailable storage', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('disabled'); });
  expect(() => saveMiniGraphRect({ x: 8, y: 8, width: 500, height: 300 })).not.toThrow();
});
