export interface SvgDocument {
  markup: string;
  width: number;
  height: number;
}

export function escapeXml(value: string): string {
  // XML 1.0 excludes unpaired surrogates and U+FFFE/U+FFFF as well as controls.
  return value.replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '')
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
  // These documents come from our generators. Rewrite only reference attributes
  // within tags: user labels and font names may literally contain "url(#...)".
  return body.replace(/<[^>]+>/g, (tag) => tag.replace(
    /(\s)(id|href|xlink:href|fill|stroke|clip-path|mask|filter|marker-start|marker-mid|marker-end)="([^"]*)"/g,
    (_attribute, space: string, name: string, value: string) => {
      let next = value;
      if (name === 'id') next = `${prefix}-${value}`;
      else if (name === 'href' || name === 'xlink:href') next = value.replace(/^#(.+)$/, `#${prefix}-$1`);
      else next = value.replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
      return `${space}${name}="${next}"`;
    },
  ));
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
