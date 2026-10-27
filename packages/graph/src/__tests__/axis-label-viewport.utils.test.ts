import type { AxisLabelDescriptor } from '../layers/AxisLabelOverlay';
import { axisLabelViewportBounds, clampAxisLabelViewport, fitAxisLabelViewport } from '../utils/axis-label-viewport.utils';

const world = { width: 740, height: 85 };
const canvas = { width: 800, height: 400 };
function label(angle: number, size = 24): AxisLabelDescriptor {
  return { id: 'origin', kind: 'x-tick', text: '26.10.2026 09:00:00:000',
    worldX: 80, worldY: 77, fontSize: size, fontFamily: 'Arial', fill: 'black',
    labelWidth: 267 * size / 24, angleDeg: angle,
    anchorX: angle < 0 ? 1 : angle === 0 ? 0.5 : 0, anchorY: 0 };
}

it.each([0, 45, -45])('keeps a 24px full date inside the fitted canvas at %i degrees', angle => {
  const labels = [label(angle)];
  const fit = fitAxisLabelViewport(world, canvas, labels, { x: 1, y: 1 }, 0.1, 5);
  // Bounds of the first date, independently calculated from its known geometry.
  const text = labels[0]!;
  const radians = angle * Math.PI / 180;
  const x = fit.x + 80 * fit.scaleX;
  const y = fit.y + 77 * fit.scaleX;
  for (const dx of [-267 * text.anchorX, 267 * (1 - text.anchorX)]) {
    for (const dy of [0, 28.8]) {
      expect(x + dx * Math.cos(radians) - dy * Math.sin(radians)).toBeGreaterThanOrEqual(0);
      expect(x + dx * Math.cos(radians) - dy * Math.sin(radians)).toBeLessThanOrEqual(canvas.width);
      expect(y + dx * Math.sin(radians) + dy * Math.cos(radians)).toBeGreaterThanOrEqual(0);
      expect(y + dx * Math.sin(radians) + dy * Math.cos(radians)).toBeLessThanOrEqual(canvas.height);
    }
  }
  expect(clampAxisLabelViewport({ ...fit, x: -1000, y: 1000 }, world, canvas, labels)).toEqual(fit);
});

it.each([10, 12, 24])('accounts for fixed %ipx labels and persisted anisotropic stretch in a narrow mini graph', size => {
  const labels = [label(-45, size), { ...label(0, size), id: 'y', kind: 'y-tick' as const,
    worldX: 68, worldY: 35, anchorX: 1, anchorY: 0.5, labelWidth: 160 }];
  const small = { width: 440, height: 300 };
  const fit = fitAxisLabelViewport(world, small, labels, { x: 2, y: 0.5 }, 0.1, 5);
  const bounds = axisLabelViewportBounds(world, labels, fit.scaleX * 2, fit.scaleY * 0.5);
  expect(fit.x + bounds.left).toBeGreaterThanOrEqual(-1e-8);
  expect(fit.y + bounds.top).toBeGreaterThanOrEqual(-1e-8);
  expect(fit.x + bounds.left + bounds.width).toBeLessThanOrEqual(small.width + 1e-8);
  expect(fit.y + bounds.top + bounds.height).toBeLessThanOrEqual(small.height + 1e-8);
});

it('does not shrink a scene when its labels already fit', () => {
  const fit = fitAxisLabelViewport(world, canvas, [label(45, 12)], { x: 1, y: 1 }, 0.1, 5);
  expect(fit.scaleX).toBe(1);
});

it('keeps zoomed content pannable to both ends with its label margins', () => {
  const labels = [label(-45)];
  const left = clampAxisLabelViewport({ scaleX: 2, scaleY: 2, x: 10000, y: 0 }, world, canvas, labels);
  const right = clampAxisLabelViewport({ ...left, x: -10000 }, world, canvas, labels);
  const bounds = axisLabelViewportBounds(world, labels, 2, 2);
  expect(left.x + bounds.left).toBe(24);
  expect(right.x + bounds.left + bounds.width).toBe(canvas.width - 24);
});
