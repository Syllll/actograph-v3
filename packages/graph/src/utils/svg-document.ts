export interface SvgDocument {
  markup: string;
  width: number;
  height: number;
}

export function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function svgNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Invalid SVG coordinate');
  return String(Number(value.toFixed(5)));
}

export function createSvgDocument(width: number, height: number, body: string): SvgDocument {
  if (width <= 0 || height <= 0) throw new Error('Invalid SVG dimensions');
  return {
    width, height,
    markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${svgNumber(width)}" height="${svgNumber(height)}" viewBox="0 0 ${svgNumber(width)} ${svgNumber(height)}">`
      + `<rect width="${svgNumber(width)}" height="${svgNumber(height)}" fill="#ffffff"/>${body}</svg>`,
  };
}

/** Keep original drawing coordinates when embedding a Pixi SVG with a nonzero viewBox. */
export function svgBody(markup: string, prefix: string): string {
  const body = markup.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return body.replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replace(/\bhref="#([^"]+)"/g, `href="#${prefix}-$1"`);
}

export function combineSvgDocuments(graph: SvgDocument, legend: SvgDocument): SvgDocument {
  const padding = 16;
  const gap = 24;
  return createSvgDocument(
    padding * 2 + graph.width + gap + legend.width,
    padding * 2 + Math.max(graph.height, legend.height),
    `<g transform="translate(${padding} ${padding})">${svgBody(graph.markup, 'graph')}</g>`
      + `<g transform="translate(${svgNumber(padding + graph.width + gap)} ${padding})">${svgBody(legend.markup, 'legend')}</g>`,
  );
}
