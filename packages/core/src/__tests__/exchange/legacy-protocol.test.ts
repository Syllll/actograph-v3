import fs from 'fs';
import path from 'path';
import { ChronicV1Parser, extractChronicV1Protocol } from '../../import/chronic-v1';
import { exchangeDocumentToTable, parseExchangeTable, validateExchangeDocument } from '../../index';

const load = (name: string) =>
  new ChronicV1Parser().parse(fs.readFileSync(path.join(__dirname, '../import/fixtures', name)));

describe('safe protocol-only extraction from real V1 binary fixtures', () => {
  const log = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  afterAll(() => log.mockRestore());
  it.each(['sample-v3.chronic', 'sample-v3-with-readings.chronic'])(
    'extracts %s without mutating readings or labels',
    (file) => {
      const source = load(file);
      const before = JSON.stringify(source);
      const document = extractChronicV1Protocol(source);
      expect(validateExchangeDocument(document).valid).toBe(true);
      expect(document.items.map((item) => item.name)).toEqual(
        source.protocol.children.map((item) => item.name),
      );
      expect(
        document.items.flatMap((item) => item.children ?? []).map((item) => item.name),
      ).toEqual(source.protocol.children.flatMap((item) => item.children).map((item) => item.name));
      expect(JSON.stringify(source)).toBe(before);
      expect(parseExchangeTable(exchangeDocumentToTable(document), 'protocol').kind).toBe(
        'protocol',
      );
      expect(document.items[0].meta?.legacyV1).toBeDefined();
    },
  );
  it('rejects names needing repair and nested or orphan structures rather than inventing categories', () => {
    const source = load('sample-v3.chronic');
    source.protocol.children[0].name = '';
    expect(() => extractChronicV1Protocol(source)).toThrow(/nom vide/);
    source.protocol.children[0].name = 'unchanged';
    source.protocol.children[0].type = 'Observable';
    expect(() => extractChronicV1Protocol(source)).toThrow(/Structure V1/);
  });

  it.each(['CATEGORY', 'CaTeGoRy', 'OBSERVABLE', 'ObSeRvAbLe'])(
    'rejects unsupported node type %s before conversion can silently drop it',
    (type) => {
      const source = load('sample-v3.chronic');
      const category = type.toLowerCase() === 'category';
      const node = category ? source.protocol.children[0] : source.protocol.children[0].children[0];
      node.type = type;
      const before = JSON.stringify(source);
      expect(() => extractChronicV1Protocol(source)).toThrow(/Structure V1/);
      expect(JSON.stringify(source)).toBe(before);
    },
  );

  it.each([
    ['category', 'observable'],
    ['Category', 'Observable'],
  ])(
    'preserves every label for supported node spellings %s and %s',
    (categoryType, observableType) => {
      const source = load('sample-v3.chronic');
      for (const category of source.protocol.children) {
        category.type = categoryType;
        for (const observable of category.children) observable.type = observableType;
      }
      const before = JSON.stringify(source);
      const document = extractChronicV1Protocol(source);
      expect(document.items.map((item) => item.name)).toEqual(
        source.protocol.children.map((item) => item.name),
      );
      expect(
        document.items.flatMap((item) => item.children ?? []).map((item) => item.name),
      ).toEqual(source.protocol.children.flatMap((item) => item.children).map((item) => item.name));
      expect(JSON.stringify(source)).toBe(before);
    },
  );
});
