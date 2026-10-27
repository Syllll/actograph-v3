/** @jest-environment jsdom */
import { persistPngTransparentBackground, readPngTransparentBackground, prepareGraphExportCanvas } from './graph-export-preferences';

it('retains only the PNG preference and ignores invalid local storage', () => {
  localStorage.clear();
  expect(readPngTransparentBackground()).toBe(false);
  persistPngTransparentBackground(true);
  expect(readPngTransparentBackground()).toBe(true);
  localStorage.setItem('actograph.graph-export-preferences.v1', 'broken');
  expect(readPngTransparentBackground()).toBe(false);
});

it('fills the global background only for opaque raster exports', () => {
  const context = { fillRect: jest.fn(), fillStyle: '' };
  const canvas = { width: 800, height: 600, getContext: () => context } as unknown as HTMLCanvasElement;
  prepareGraphExportCanvas(canvas, true);
  expect(context.fillRect).not.toHaveBeenCalled();
  prepareGraphExportCanvas(canvas, false);
  expect(context.fillStyle).toBe('#ffffff');
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
});
