import type { AxisLabelDescriptor } from '../layers/AxisLabelOverlay';
import { rotatedLabelBounds, resolveAutomaticLabelAngle, selectNonOverlappingLabels } from './axis-label-layout.utils';
import { clampViewport, type CanvasSize, type ViewportState, type WorldBounds } from './viewport.utils';

/** Labels keep their pixel size while their anchor positions follow the camera. */
export function axisLabelViewportBounds(world: WorldBounds, labels: AxisLabelDescriptor[],
  scaleX: number, scaleY: number) {
  const xLabels = labels.filter(label => label.kind === 'x-tick');
  const automaticAngle = resolveAutomaticLabelAngle(xLabels.map(label => ({
    id: label.id, x: label.worldX * scaleX,
    width: label.labelWidth ?? label.text.length * label.fontSize * 0.6, anchorX: 0.5,
  })));
  const projected = labels.filter(label => label.kind !== 'format-mention').map(label => {
    const angle = label.automaticOrientation ? automaticAngle : label.angleDeg;
    const anchor = label.automaticOrientation ? (angle === 0 ? 0.5 : 0) : label.anchorX;
    const bounds = rotatedLabelBounds(label.labelWidth ?? label.text.length * label.fontSize * 0.6,
      label.fontSize * 1.2, angle, anchor, label.anchorY);
    return { label, left: label.worldX * scaleX + bounds.left,
      right: label.worldX * scaleX + bounds.right,
      top: label.worldY * scaleY + bounds.top, bottom: label.worldY * scaleY + bounds.bottom };
  });
  const visible = selectNonOverlappingLabels(projected.filter(item => item.label.kind === 'x-tick')
    .map(item => ({ id: item.label.id, x: item.left, width: item.right - item.left })));
  let left = 0, top = 0, right = world.width * scaleX, bottom = world.height * scaleY;
  for (const item of projected) {
    if (item.label.kind === 'x-tick' && !visible.has(item.label.id)) continue;
    // One pixel covers antialiasing and the rounding of actual Text metrics.
    left = Math.min(left, item.left - 1);
    right = Math.max(right, item.right + 1);
    top = Math.min(top, item.top - 1);
    bottom = Math.max(bottom, item.bottom + 1);
  }
  return { left, top, width: right - left, height: bottom - top };
}

export function fitAxisLabelViewport(world: WorldBounds, canvas: CanvasSize,
  labels: AxisLabelDescriptor[], stretch: { x: number; y: number }, minScale: number, maxScale: number): ViewportState {
  let lower = minScale, upper = Math.max(minScale, Math.min(1, maxScale));
  const fullSize = axisLabelViewportBounds(world, labels, upper * stretch.x, upper * stretch.y);
  if (fullSize.width <= canvas.width && fullSize.height <= canvas.height) lower = upper;
  for (let step = 0; lower < upper && step < 40; step++) {
    const scale = (lower + upper) / 2;
    const bounds = axisLabelViewportBounds(world, labels, scale * stretch.x, scale * stretch.y);
    if (bounds.width <= canvas.width && bounds.height <= canvas.height) lower = scale;
    else upper = scale;
  }
  const bounds = axisLabelViewportBounds(world, labels, lower * stretch.x, lower * stretch.y);
  return { scaleX: lower, scaleY: lower,
    x: Math.max(0, (canvas.width - bounds.width) / 2) - bounds.left,
    y: Math.max(0, (canvas.height - bounds.height) / 2) - bounds.top };
}

export function clampAxisLabelViewport(viewport: ViewportState, world: WorldBounds,
  canvas: CanvasSize, labels: AxisLabelDescriptor[]): ViewportState {
  const bounds = axisLabelViewportBounds(world, labels, viewport.scaleX, viewport.scaleY);
  const clamped = clampViewport({ scaleX: 1, scaleY: 1,
    x: viewport.x + bounds.left, y: viewport.y + bounds.top }, bounds, canvas);
  return { ...viewport, x: clamped.x - bounds.left, y: clamped.y - bounds.top };
}
