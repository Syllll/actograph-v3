import { graphExportFile } from './graph-export-file';

describe('graph export file encoding', () => {
  it('writes SVG as UTF-8 and preserves accents and Unicode', () => {
    const svg = '<svg><text>Été, cœur, 日本語 &amp; activité</text></svg>';
    const file = graphExportFile('svg', svg);
    expect(file).toMatchObject({ extension: 'svg', encoding: 'utf8', data: svg });
    expect(file.blob.type).toBe('image/svg+xml;charset=utf-8');
    expect(file.blob.size).toBe(Buffer.byteLength(svg, 'utf8'));
  });

  it.each([['png', 'png', 'image/png'], ['jpeg', 'jpg', 'image/jpeg']] as const)(
    'keeps %s exports as binary images', (format, extension, mime) => {
      const file = graphExportFile(format, `data:${mime};base64,aGVsbG8=`);
      expect(file).toMatchObject({ extension, encoding: 'base64', data: 'aGVsbG8=' });
      expect(file.blob.type).toBe(mime);
      expect(file.blob.size).toBe(5);
    },
  );
});
