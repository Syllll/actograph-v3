import { createSvgDocument, escapeXml, type SvgDocument } from '@actograph/graph';

export interface GraphLegendRow {
  label: string;
  color: string;
  isCategory?: boolean;
}

export const LEGEND_LAYOUT = { rowHeight: 28, padding: 18, swatch: 14, width: 900 };

export function buildLegendSvg(rows: readonly GraphLegendRow[]): SvgDocument {
  const { rowHeight, padding, swatch, width } = LEGEND_LAYOUT;
  const height = padding * 2 + rows.length * rowHeight;
  const body = rows.map((row, i) => {
    const y = padding + i * rowHeight;
    const x = row.isCategory ? padding : padding + 8 + swatch + 12;
    const chip = row.isCategory ? ''
      : `<rect x="${padding + 8}" y="${y + 6}" width="${swatch}" height="${swatch}" fill="${escapeXml(row.color)}" stroke="#111827"/>`;
    return chip + `<text x="${x}" y="${y + 18}" font-family="Arial" font-size="14" font-weight="${row.isCategory ? 'bold' : 'normal'}" fill="#111827" xml:space="preserve">${escapeXml(row.label)}</text>`;
  }).join('');
  return createSvgDocument(width, height,
    `<rect width="${width}" height="${height}" fill="none" stroke="#d1d5db"/>${body}`);
}
