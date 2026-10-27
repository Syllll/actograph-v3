import { LEGEND_LAYOUT, type GraphLegendRow } from './graph-legend-export';
import { prepareGraphExportCanvas } from './graph-export-preferences';

export function buildGraphLegendCanvas(rows: GraphLegendRow[], transparent = false): HTMLCanvasElement | null {
  const { rowHeight, padding, swatch, width } = LEGEND_LAYOUT;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = padding * 2 + rows.length * rowHeight;
  const ctx = prepareGraphExportCanvas(canvas, transparent);
  if (!ctx) return null;
  ctx.strokeStyle = '#d1d5db';
  ctx.strokeRect(0, 0, width, canvas.height);
  ctx.font = '14px Arial';
  rows.forEach((row, index) => {
    const y = padding + index * rowHeight;
    ctx.fillStyle = '#111827';
    if (row.isCategory) {
      ctx.font = 'bold 14px Arial';
      ctx.fillText(row.label, padding, y + 18);
      ctx.font = '14px Arial';
    } else {
      ctx.fillStyle = row.color;
      ctx.fillRect(padding + 8, y + 6, swatch, swatch);
      ctx.strokeStyle = '#111827';
      ctx.strokeRect(padding + 8, y + 6, swatch, swatch);
      ctx.fillStyle = '#111827';
      ctx.fillText(row.label, padding + 8 + swatch + 12, y + 18);
    }
  });
  return canvas;
}

export function combineGraphLegendCanvas(graph: HTMLImageElement, legend: HTMLCanvasElement,
  transparent = false): HTMLCanvasElement | null {
  const padding = 16;
  const gap = 24;
  const canvas = document.createElement('canvas');
  canvas.width = padding * 2 + graph.naturalWidth + gap + legend.width;
  canvas.height = padding * 2 + Math.max(graph.naturalHeight, legend.height);
  const ctx = prepareGraphExportCanvas(canvas, transparent);
  if (!ctx) return null;
  ctx.drawImage(graph, padding, padding);
  ctx.drawImage(legend, padding + graph.naturalWidth + gap, padding);
  return canvas;
}
