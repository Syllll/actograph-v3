import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

export interface IVector2D {
  x: number;
  y: number;
}

export const exportToBuffer = (v: IVector2D): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(v.x).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(v.y).toBuffer()]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer): IVector2D => {
  const x = types.QDouble.read(buffer);
  const y = types.QDouble.read(buffer);

  return {
    x,
    y,
  };
};
