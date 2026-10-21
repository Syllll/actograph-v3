jest.mock('@actograph/graph', () => jest.requireActual('../../../packages/graph/src/utils/svg-document'));
import { buildLegendSvg } from './graph-legend-export';

describe('SVG legend export', () => {
  it('preserves category and observable labels and escapes XML markup', () => {
    const { markup, width, height } = buildLegendSvg([
      { label: 'Activité <A&B>', color: '#ff0000', isCategory: true },
      { label: '  Café 日本語', color: '#123456' },
    ]);
    expect({ width, height }).toEqual({ width: 900, height: 92 });
    expect(markup).toContain('Activité &lt;A&amp;B&gt;');
    expect(markup).toContain('  Café 日本語');
    expect(markup).toContain('fill="#123456"');
    expect(markup).not.toMatch(/<image|data:image/);
  });
});
