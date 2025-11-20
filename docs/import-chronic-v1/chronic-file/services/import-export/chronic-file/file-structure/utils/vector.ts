import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

export const exportToBuffer = (
  v: unknown[],
  options: {
    exportValueCB: (value: any) => Buffer;
  },
): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QUInt(v.length).toBuffer()]);
  for (const value of v) {
    Buffer.concat([buffer, options.exportValueCB(value)]);
  }

  return buffer;
};

export const importFromBuffer = (
  buffer: Buffer,
  options: {
    importValueCB: (buffer: Buffer) => any;
  },
): unknown[] => {
  const size = types.QUInt.read(buffer);

  const values = [] as any[];
  for (let i = 0, ie = size; i < ie; i++) {
    const value = options.importValueCB(buffer);
    values.push(value);
  }

  return values;
};
