import {
  ObservationModeEnum,
  ProtocolItemTypeEnum,
  ReadingTypeEnum,
  ProtocolItemActionEnum,
} from '../enums';
import { IProtocolItem, IGraphPreferences } from '../types/protocol.types';
import { assertValidExchangeDocument } from './documents';
import {
  ExchangeKind,
  ExchangeParseError,
  ProtocolExchangeDocument,
  ReadingExchangeDocument,
  TabularExchangeDocument,
} from './types';

const READING_HEADERS = [
  'order',
  'type',
  'name',
  'description',
  'time_ms',
  'timestamp',
  'name_null',
  'description_null',
];
const PROTOCOL_HEADERS = [
  'id',
  'parent_id',
  'type',
  'name',
  'description',
  'action',
  'order',
  'graph_preferences',
  'meta',
  'description_null',
];

export function exchangeDocumentToTable(document: TabularExchangeDocument): string[][] {
  assertValidExchangeDocument(document);
  if (document.kind === 'readings')
    return [
      ['actograph-tabular', '1', 'readings', document.mode],
      READING_HEADERS,
      ...document.readings.map((reading) => [
        String(reading.order),
        reading.type,
        reading.name ?? '',
        reading.description ?? '',
        document.mode === ObservationModeEnum.Chronometer ? String(reading.time) : '',
        document.mode === ObservationModeEnum.Calendar ? String(reading.time) : '',
        String(reading.name === null),
        String(reading.description === null),
      ]),
    ];
  const rows: string[][] = [];
  const visit = (items: IProtocolItem[], parentId: string): void =>
    items.forEach((item, order) => {
      rows.push([
        item.id,
        parentId,
        item.type,
        item.name,
        item.description ?? '',
        item.action ?? '',
        // The current array is the UI order. Stored order fields can be stale
        // after a reorder or append, so exporting them could reorder the file.
        String(order),
        item.graphPreferences === undefined ? '' : JSON.stringify(item.graphPreferences),
        item.meta === undefined ? '' : JSON.stringify(item.meta),
        String(item.description === null),
      ]);
      if (item.children) visit(item.children, item.id);
    });
  visit(document.items, '');
  return [['actograph-tabular', '1', 'protocol', ''], PROTOCOL_HEADERS, ...rows];
}

const ALIASES: Record<string, string> = {
  ordre: 'order',
  libelle: 'name',
  nom: 'name',
  observable: 'name',
  commentaire: 'description',
  temps_ms: 'time_ms',
  millisecondes: 'time_ms',
  date_iso: 'timestamp',
  datetime: 'timestamp',
  parent: 'parent_id',
  parentid: 'parent_id',
  graphpreferences: 'graph_preferences',
};
const normalizeHeader = (value: string): string => {
  const key = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  return ALIASES[key] ?? key;
};

export function parseExchangeTable(
  table: readonly (readonly unknown[])[],
  kind: ExchangeKind,
  mode?: ObservationModeEnum,
): TabularExchangeDocument {
  const rows = table.map((row, index) =>
    row.map((cell) => {
      if (cell === undefined || cell === null) return '';
      if (typeof cell !== 'string' && typeof cell !== 'number' && typeof cell !== 'boolean')
        throw new ExchangeParseError([
          { code: 'cell', row: index + 1, message: 'Cellule non textuelle ou formule interdite.' },
        ]);
      return String(cell);
    }),
  );
  const native = rows[0]?.[0] === 'actograph-tabular';
  let selectedMode = mode;
  if (native) {
    if (rows[0][1] !== '1' || rows[0][2] !== kind)
      throw new ExchangeParseError([
        { code: 'version', message: 'Version ou type de fichier incompatible.' },
      ]);
    if (kind === 'readings') {
      if (mode !== undefined && rows[0][3] !== mode)
        throw new ExchangeParseError([
          { code: 'mode', message: 'Mode temporel incompatible avec la chronique.' },
        ]);
      selectedMode = rows[0][3] as ObservationModeEnum;
    }
    if (rows[0][4] === 'csv-text-v1')
      for (const row of rows.slice(2))
        for (let i = 0; i < row.length; i++) if (row[i].startsWith("'")) row[i] = row[i].slice(1);
  }
  const headerIndex = native ? 1 : 0;
  const headers = (rows[headerIndex] ?? []).map(normalizeHeader);
  if (!headers.length || new Set(headers).size !== headers.length)
    throw new ExchangeParseError([{ code: 'headers', message: 'En-têtes absents ou dupliqués.' }]);
  const required =
    kind === 'readings'
      ? ['name', 'type', selectedMode === ObservationModeEnum.Calendar ? 'timestamp' : 'time_ms']
      : ['id', 'parent_id', 'type', 'name'];
  for (const header of required)
    if (!headers.includes(header))
      throw new ExchangeParseError([{ code: 'headers', message: `Colonne requise : ${header}` }]);
  const data = rows
    .slice(headerIndex + 1)
    .map((row, index) => {
      const line = index + headerIndex + 2;
      if (row.length !== headers.length && row.some((cell) => cell !== ''))
        throw new ExchangeParseError([
          { code: 'columns', row: line, message: 'Nombre de colonnes incohérent.' },
        ]);
      return { row, line };
    })
    .filter(({ row }) => row.some((cell) => cell !== ''));
  const get = (row: string[], key: string): string => row[headers.indexOf(key)] ?? '';
  const numeric = (text: string, row: number): number => {
    if (!/^\d+$/.test(text))
      throw new ExchangeParseError([
        { code: 'number', row, message: 'Entier positif ou nul attendu.' },
      ]);
    return Number(text);
  };
  let document: TabularExchangeDocument;
  if (kind === 'readings') {
    const readingsDocument: ReadingExchangeDocument = {
      format: 'actograph-tabular',
      version: 1,
      kind,
      mode: selectedMode as ObservationModeEnum,
      readings: data.map(({ row, line }, index) => ({
        order: get(row, 'order') === '' ? index : numeric(get(row, 'order'), line),
        type: get(row, 'type') as ReadingTypeEnum,
        name: get(row, 'name_null') === 'true' ? null : get(row, 'name'),
        description: get(row, 'description_null') === 'true' ? null : get(row, 'description'),
        time:
          selectedMode === ObservationModeEnum.Chronometer
            ? numeric(get(row, 'time_ms'), line)
            : get(row, 'timestamp'),
      })),
    };
    document = readingsDocument;
  } else {
    const roots: IProtocolItem[] = [],
      byId = new Map<string, IProtocolItem>();
    const parsed = data.map(({ row, line }, index) => {
      const json = (key: string): unknown => {
        const text = get(row, key);
        if (text === '') return undefined;
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new ExchangeParseError([
            { code: 'json', row: line, message: `JSON invalide : ${key}` },
          ]);
        }
      };
      const graphPreferences = json('graph_preferences'),
        meta = json('meta');
      const item: IProtocolItem & { order: number } = {
        id: get(row, 'id'),
        type: get(row, 'type') as ProtocolItemTypeEnum,
        name: get(row, 'name'),
        description: get(row, 'description_null') === 'true' ? null : get(row, 'description'),
        order: get(row, 'order') === '' ? index : numeric(get(row, 'order'), line),
        ...(get(row, 'action') ? { action: get(row, 'action') as ProtocolItemActionEnum } : {}),
        ...(graphPreferences === undefined
          ? {}
          : { graphPreferences: graphPreferences as IGraphPreferences }),
        ...(meta === undefined ? {} : { meta: meta as Record<string, unknown> }),
      };
      if (byId.has(item.id))
        throw new ExchangeParseError([{ code: 'id', row: line, message: 'Référence dupliquée.' }]);
      byId.set(item.id, item);
      return { item, parentId: get(row, 'parent_id'), line };
    });
    for (const { item, parentId, line } of parsed) {
      if (!parentId) roots.push(item);
      else {
        const parent = byId.get(parentId);
        if (
          !parent ||
          parent.type !== ProtocolItemTypeEnum.Category ||
          item.type !== ProtocolItemTypeEnum.Observable
        )
          throw new ExchangeParseError([
            { code: 'parent', row: line, message: 'Parent de protocole invalide.' },
          ]);
        (parent.children ??= []).push(item);
      }
    }
    const orderItems = (items: IProtocolItem[]): void => {
      items.sort(
        (a, b) =>
          (a as IProtocolItem & { order: number }).order -
          (b as IProtocolItem & { order: number }).order,
      );
      for (const item of items) if (item.children) orderItems(item.children);
    };
    orderItems(roots);
    const protocolDocument: ProtocolExchangeDocument = {
      format: 'actograph-tabular',
      version: 1,
      kind,
      items: roots,
    };
    document = protocolDocument;
  }
  assertValidExchangeDocument(document);
  return document;
}
