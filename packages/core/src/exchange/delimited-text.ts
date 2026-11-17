import { ExchangeParseError } from './types';

/** Strict quoted-field parser, with separator detection outside quoted fields. */
export function parseDelimitedText(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0];
  const counts = new Map([
    [';', 0],
    [',', 0],
    ['\t', 0],
  ]);
  let quoted = false;
  for (let index = 0; index < firstLine.length; index++) {
    if (firstLine[index] === '"') {
      if (quoted && firstLine[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && counts.has(firstLine[index]))
      counts.set(firstLine[index], counts.get(firstLine[index])! + 1);
  }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const result: string[][] = [];
  let row: string[] = [],
    field = '',
    inQuotes = false,
    closed = false;
  const fail = (): never => {
    throw new ExchangeParseError([
      { code: 'csv', row: result.length + 1, message: 'Guillemets CSV invalides.' },
    ]);
  };
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (inQuotes) {
      if (char !== '"') field += char;
      else if (source[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        inQuotes = false;
        closed = true;
      }
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      closed = false;
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(field);
      result.push(row);
      row = [];
      field = '';
      closed = false;
      continue;
    }
    if (closed) fail();
    if (char === '"') {
      if (field.length) fail();
      inQuotes = true;
    } else field += char;
  }
  if (inQuotes) fail();
  if (field.length || row.length || closed) {
    row.push(field);
    result.push(row);
  }
  return result;
}

/** Native metadata records the reversible CSV protection of text resembling formulas. */
export function serializeDelimitedText(
  table: readonly (readonly string[])[],
  delimiter = ';',
): string {
  if (![';', ',', '\t'].includes(delimiter)) throw new Error('Séparateur CSV invalide.');
  const native = table[0]?.[0] === 'actograph-tabular';
  const rows = table.map((row) => [...row]);
  if (native) rows[0][4] = 'csv-text-v1';
  return (
    '\uFEFF' +
    rows
      .map((row, index) =>
        row
          .map((cell) => {
            let value = cell;
            if (native && index > 1 && /^(?:[=+\-@'\t\r\n]|\s+[=+\-@])/.test(value))
              value = "'" + value;
            return '"' + value.replace(/"/g, '""') + '"';
          })
          .join(delimiter),
      )
      .join('\r\n') +
    '\r\n'
  );
}
