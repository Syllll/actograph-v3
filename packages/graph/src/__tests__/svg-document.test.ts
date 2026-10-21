import { combineSvgDocuments, createSvgDocument, escapeXml, svgBody } from '../utils/svg-document';

describe('SVG document composition', () => {
  it('escapes user labels and removes invalid XML control characters', () => {
    expect(escapeXml('Été <script>"A&B"\u0001')).toBe('Été &lt;script&gt;&quot;A&amp;B&quot;');
  });

  it('keeps local coordinates and isolates repeated definition identifiers', () => {
    const svg = '<svg viewBox="30 20 40 50"><defs><linearGradient id="a"/></defs><path d="M30 20" fill="url(#a)"/></svg>';
    const body = svgBody(svg, 'first');
    expect(body).toContain('d="M30 20"');
    expect(body).toContain('id="first-a"');
    expect(body).toContain('url(#first-a)');
    expect(body).not.toContain('<svg');
  });

  it('composes graph and legend with their full dimensions and independent definitions', () => {
    const body = '<defs><pattern id="p"/></defs><rect fill="url(#p)"/>';
    const result = combineSvgDocuments(createSvgDocument(800, 1200, body), createSvgDocument(900, 300, body));
    expect(result).toMatchObject({ width: 1756, height: 1232 });
    expect(result.markup).toContain('translate(840 16)');
    expect(result.markup).toContain('id="graph-p"');
    expect(result.markup).toContain('url(#legend-p)');
    expect(result.markup).not.toMatch(/<image|data:image/);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid dimension %s', (width) => {
    expect(() => createSvgDocument(width, 100, '')).toThrow();
  });
});
