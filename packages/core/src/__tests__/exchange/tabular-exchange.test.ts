import {
  createProtocolExchange,
  createReadingsExchange,
  diagnoseProtocolCorrespondence,
  exchangeDocumentToTable,
  exchangeReadingsToReadings,
  ExchangeParseError,
  EXCHANGE_CHRONOMETER_ZERO_MS,
  isExchangeCalendarTime,
  isLegacyReadingsText,
  ObservationModeEnum,
  parseDelimitedText,
  parseExchangeTable,
  parseLegacyReadingsText,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
  ReadingTypeEnum,
  serializeDelimitedText,
  validateExchangeDocument,
  DisplayModeEnum,
} from '../../index';
import type { IProtocolItem, IReading, ReadingExchangeDocument } from '../../index';

const chrono = ObservationModeEnum.Chronometer;
const calendar = ObservationModeEnum.Calendar;
const makeReading = (name: string | null, time = 0, sortOrder = 0): IReading => ({
  name,
  description: 'é;"à"\nligne suivante',
  type: ReadingTypeEnum.DATA,
  dateTime: new Date(EXCHANGE_CHRONOMETER_ZERO_MS + time),
  sortOrder,
});
const category = (name: string, children: IProtocolItem[] = []): IProtocolItem => ({
  id: name,
  name,
  type: ProtocolItemTypeEnum.Category,
  children,
});
const observable = (name: string, id = name): IProtocolItem => ({
  id,
  name,
  type: ProtocolItemTypeEnum.Observable,
  action: ProtocolItemActionEnum.Continuous,
});

describe('tabular exchange lossless documents', () => {
  it.each([';', ',', '\t'])(
    'preserves literal text, milliseconds and long durations through %s CSV',
    (delimiter) => {
      const names = [
        '=SUM(A1:A2)',
        '+42',
        '-Valeur',
        '@A',
        "'déjà cité",
        '\t=1',
        ' \t+1',
        '0012',
        'é;"q",\ntexte',
      ];
      const source = names.map((name, order) => makeReading(name, 12 * 86400000 + 123, order));
      source.push({ ...makeReading(null, 0), description: null });
      const document = createReadingsExchange(source, chrono);
      const matrix = exchangeDocumentToTable(document);
      const serialized = serializeDelimitedText(matrix, delimiter);
      expect(serialized).toContain('csv-text-v1');
      const imported = parseExchangeTable(
        parseDelimitedText(serialized),
        'readings',
        chrono,
      ) as ReadingExchangeDocument;
      expect(imported).toEqual(document);
      expect(exchangeReadingsToReadings(imported)).toEqual(exchangeReadingsToReadings(document));
      expect(matrix[0]).toHaveLength(4);
      expect(serialized).not.toContain('1989');
    },
  );

  it('retains exact millisecond instants and explicit equal-time order', () => {
    const source = [makeReading('B', 123, 2), makeReading('A', 123, 1)];
    const document = createReadingsExchange(source, calendar);
    expect(document.readings.map((reading) => reading.name)).toEqual(['A', 'B']);
    expect(document.readings[0].time).toBe('1989-02-09T00:00:00.123Z');
    expect(parseExchangeTable(exchangeDocumentToTable(document), 'readings', calendar)).toEqual(
      document,
    );
    expect(
      exchangeReadingsToReadings(document).map((reading) => reading.dateTime.getTime()),
    ).toEqual([EXCHANGE_CHRONOMETER_ZERO_MS + 123, EXCHANGE_CHRONOMETER_ZERO_MS + 123]);
  });

  it('uses database IDs as the legacy sort fallback', () => {
    const document = createReadingsExchange(
      [
        { ...makeReading('explicit', 1, 5), id: 2 },
        { ...makeReading('legacy', 1), sortOrder: null, id: 10 },
      ],
      chrono,
    );
    expect(document.readings.map((reading) => reading.name)).toEqual(['explicit', 'legacy']);
  });

  it('sorts imported rows by their explicit order without modifying source', () => {
    const document = createReadingsExchange([makeReading('A'), makeReading('B', 1)], chrono);
    document.readings.reverse();
    const before = JSON.stringify(document);
    expect(exchangeReadingsToReadings(document).map((reading) => reading.name)).toEqual(['A', 'B']);
    expect(JSON.stringify(document)).toBe(before);
  });

  it('preserves empty categories, explicit versus inherited preferences, meta and support references', () => {
    const items = [category('empty'), category('activity', [observable('A')])];
    items[0].description = null;
    items[0].meta = { custom: ['001', null] };
    items[1].graphPreferences = {
      visible: false,
      supportCategoryId: 'empty',
      displayMode: DisplayModeEnum.Background,
    };
    items[1].children![0].graphPreferences = { color: '#ff00ff' };
    const before = JSON.stringify(items);
    const document = createProtocolExchange(items);
    expect(document.items[0].id).toBe('item-1');
    expect(document.items[1].graphPreferences?.supportCategoryId).toBe('item-1');
    const imported = parseExchangeTable(
      parseDelimitedText(serializeDelimitedText(exchangeDocumentToTable(document))),
      'protocol',
    );
    expect(imported.kind).toBe('protocol');
    if (imported.kind !== 'protocol') throw new Error('wrong kind');
    expect(imported.items[0].name).toBe('empty');
    expect(imported.items[0].children ?? []).toHaveLength(0);
    expect(imported.items[0].description).toBeNull();
    expect(imported.items[0].meta).toEqual(items[0].meta);
    expect(imported.items[0].graphPreferences).toBeUndefined();
    expect(imported.items[1].graphPreferences).toEqual(document.items[1].graphPreferences);
    expect(imported.items[1].children![0].graphPreferences).toEqual({ color: '#ff00ff' });
    expect(JSON.stringify(items)).toBe(before);
  });

  it('exports malformed support references as portable warnings without blocking raw data', () => {
    const items = [category('A')];
    items[0].graphPreferences = { supportCategoryId: 'old-database-id' };
    const document = createProtocolExchange(items);
    expect(document.items[0].graphPreferences?.supportCategoryId).toMatch(/^missing-support-/);
    expect(validateExchangeDocument(document).valid).toBe(true);
    expect(validateExchangeDocument(document).warnings[0].code).toBe('support_reference');
  });

  it('handles empty documents with metadata and headers', () => {
    for (const document of [createReadingsExchange([], chrono), createProtocolExchange([])]) {
      expect(
        parseExchangeTable(
          parseDelimitedText(serializeDelimitedText(exchangeDocumentToTable(document))),
          document.kind,
          chrono,
        ),
      ).toEqual(document);
    }
  });
});

describe('effective protocol array ordering', () => {
  it.each(['reorder', 'append'] as const)(
    'round-trips %s despite stale item.order fields without mutating the source',
    (change) => {
      const children = [
        Object.assign(observable('X'), { order: 0 }),
        Object.assign(observable('Y'), { order: 1 }),
      ];
      const items = [
        Object.assign(category('A', children), { order: 0, description: 'Texte intact' }),
        Object.assign(category('B'), { order: 1 }),
      ];
      if (change === 'reorder') {
        items.reverse();
        children.reverse();
      } else {
        items.push(Object.assign(category('C'), { order: 0, description: 'Ajout' }));
        children.push(Object.assign(observable('Z'), { order: 0 }));
      }
      const before = JSON.stringify(items);
      const document = createProtocolExchange(items);
      const imported = parseExchangeTable(
        parseDelimitedText(serializeDelimitedText(exchangeDocumentToTable(document))),
        'protocol',
      );
      if (imported.kind !== 'protocol') throw new Error('wrong kind');
      expect(imported.items.map((item) => item.name)).toEqual(items.map((item) => item.name));
      expect(
        imported.items.find((item) => item.name === 'A')?.children?.map((item) => item.name),
      ).toEqual(children.map((item) => item.name));
      expect(imported.items.find((item) => item.name === 'A')?.description).toBe('Texte intact');
      expect(JSON.stringify(items)).toBe(before);
    },
  );
});

describe('non mutating correspondence diagnostics', () => {
  it('excludes comments and session markers, preserves unknown and ambiguous data verbatim', () => {
    const items = [
      category('C1', [observable('known'), observable('same', 'one')]),
      category('C2', [observable('same', 'two')]),
    ];
    const readings = [
      makeReading('unknown'),
      makeReading('unknown'),
      makeReading('# comment'),
      makeReading('same'),
      { ...makeReading('marker'), type: ReadingTypeEnum.START },
      makeReading('known'),
    ];
    const before = JSON.stringify({ items, readings });
    expect(diagnoseProtocolCorrespondence(readings, items)).toEqual({
      unknownReadingCount: 2,
      unknownNames: ['unknown'],
      ambiguousReadingCount: 1,
      ambiguousNames: ['same'],
      duplicateObservableNames: ['same'],
    });
    expect(JSON.stringify({ items, readings })).toBe(before);
    expect(createReadingsExchange(readings, chrono).readings).toHaveLength(6);
  });

  it('counts unnamed DATA as unknown while keeping source names and session markers unchanged', () => {
    const readings = [
      { ...makeReading(''), name: null },
      makeReading(''),
      makeReading('# commentaire'),
      { ...makeReading(''), name: null, type: ReadingTypeEnum.START },
      { ...makeReading(''), type: ReadingTypeEnum.STOP },
    ];
    const before = JSON.stringify(readings);
    expect(diagnoseProtocolCorrespondence(readings, [])).toMatchObject({
      unknownReadingCount: 2,
      unknownNames: [''],
      ambiguousReadingCount: 0,
    });
    expect(JSON.stringify(readings)).toBe(before);
  });
});

describe('strict tabular validation', () => {
  it.each([
    '2026-02-30T12:00:00.000Z',
    '17/11/2026 12:00:00',
    '2026-11-17T12:00:00',
    '2026-11-17T12:00:00.1234Z',
    '2026-11-17T24:00:00Z',
  ])('rejects ambiguous or invalid calendar time %s', (time) => {
    expect(isExchangeCalendarTime(time)).toBe(false);
    const document = createReadingsExchange([makeReading('A')], calendar);
    document.readings[0].time = time;
    expect(validateExchangeDocument(document).valid).toBe(false);
  });
  it('accepts an explicit offset and validates type, integer milliseconds, order and mode', () => {
    expect(isExchangeCalendarTime('2026-11-17T12:00:00.123+01:00')).toBe(true);
    const document = createReadingsExchange([makeReading('A')], chrono);
    expect(validateExchangeDocument(document, 'readings', calendar).valid).toBe(false);
    for (const bad of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) {
      document.readings[0].time = bad;
      expect(validateExchangeDocument(document).valid).toBe(false);
    }
    expect(
      validateExchangeDocument({
        ...document,
        readings: [{ order: 0, type: 'unrecognized', time: 1 }],
      }).valid,
    ).toBe(false);
  });
  it('rejects malformed CSV, truncated columns, invalid JSON, cells and structure', () => {
    expect(() => parseDelimitedText('a;b\n"never closed')).toThrow(ExchangeParseError);
    expect(() => parseDelimitedText('a;b\nx"bad;y')).toThrow(ExchangeParseError);
    expect(() => parseDelimitedText('a;b\n"closed"x;y')).toThrow(ExchangeParseError);
    expect(() =>
      parseExchangeTable(
        [
          ['name', 'type', 'time_ms'],
          ['A', 'data'],
        ],
        'readings',
        chrono,
      ),
    ).toThrow(ExchangeParseError);
    expect(() =>
      parseExchangeTable(
        [
          ['name', 'type', 'time_ms'],
          [{ formula: '1+1' }, 'data', 0],
        ],
        'readings',
        chrono,
      ),
    ).toThrow(ExchangeParseError);
    const table = exchangeDocumentToTable(createProtocolExchange([category('C')]));
    table[2][7] = '{bad';
    expect(() => parseExchangeTable(table, 'protocol')).toThrow(ExchangeParseError);
    expect(validateExchangeDocument(createProtocolExchange([observable('root')])).valid).toBe(
      false,
    );
  });
  it('reads explicitly labelled external data, does not guess time units or type', () => {
    const document = parseExchangeTable(
      [
        ['Libellé', 'type', 'millisecondes'],
        ['0003', 'data', '125'],
      ],
      'readings',
      chrono,
    ) as ReadingExchangeDocument;
    expect(document.readings[0]).toMatchObject({ name: '0003', time: 125 });
    expect(() =>
      parseExchangeTable(
        [
          ['name', 'type', 'time'],
          ['A', 'data', '1.25'],
        ],
        'readings',
        chrono,
      ),
    ).toThrow(ExchangeParseError);
  });
  it('warns on duplicates and incoherent session markers without dropping rows', () => {
    const document = createReadingsExchange(
      [{ ...makeReading('stop'), type: ReadingTypeEnum.STOP }, makeReading('A'), makeReading('A')],
      chrono,
    );
    const result = validateExchangeDocument(document);
    expect(result.valid).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(['duplicate', 'session']),
    );
    expect(exchangeReadingsToReadings(document)).toHaveLength(3);
  });
});

const legacy = (mode: 0 | 1, ...lines: string[]): string =>
  [
    '# Data export file',
    '# Data mod (0: chronometer, 1: calendar)',
    String(mode),
    '# Flag, time, name',
    ...lines,
    '',
  ].join('\r\n');
describe('ActoGraph V1 text export compatibility (DataList.cc and mode converters)', () => {
  it('parses exact double-tab layout, weeks, days and milliseconds with names untouched', () => {
    const source = legacy(
      0,
      'start\t\t0 0 00:00:00.000\t\t# start the observation',
      'data\t\t2 3 12:34:56.789\t\t"É;001"\t\tfin',
      'stop\t\t2 3 12:34:56.789\t\t# stop the observation',
    );
    expect(isLegacyReadingsText(source)).toBe(true);
    const document = parseLegacyReadingsText(source, { mode: chrono });
    expect(document.readings[1]).toMatchObject({
      name: '"É;001"\t\tfin',
      time: (17 * 86400 + 12 * 3600 + 34 * 60 + 56) * 1000 + 789,
    });
    expect(
      parseExchangeTable(
        parseDelimitedText(serializeDelimitedText(exchangeDocumentToTable(document))),
        'readings',
        chrono,
      ),
    ).toEqual(document);
  });
  it('requires a chosen calendar timezone and preserves exact time through explicit normalization', () => {
    const source = legacy(1, 'data\t\t17/11/2026 12:34:56.789\t\t A ');
    expect(() => parseLegacyReadingsText(source)).toThrow(/fuseau/);
    expect(
      parseLegacyReadingsText(source, { mode: calendar, timeZone: 'Europe/Paris' }).readings[0],
    ).toMatchObject({ name: ' A ', time: '2026-11-17T11:34:56.789Z' });
    expect(() =>
      parseLegacyReadingsText(source, { mode: chrono, timeZone: 'Europe/Paris' }),
    ).toThrow(/mode/);
  });
  it('rejects DST ambiguity, impossible dates, unknown flags and unrepresentable line breaks', () => {
    for (const time of [
      '25/10/2026 02:30:00.000',
      '29/03/2026 02:30:00.000',
      '30/02/2026 12:00:00.000',
    ]) {
      expect(() =>
        parseLegacyReadingsText(legacy(1, `data\t\t${time}\t\tA`), { timeZone: 'Europe/Paris' }),
      ).toThrow(ExchangeParseError);
    }
    expect(() => parseLegacyReadingsText(legacy(0, 'off\t\t0 0 00:00:00.000\t\tA'))).toThrow(
      /non pris en charge/,
    );
    expect(() =>
      parseLegacyReadingsText(legacy(0, 'data\t\t0 0 00:00:00.000\t\tA', 'continued name')),
    ).toThrow(ExchangeParseError);
  });
});
