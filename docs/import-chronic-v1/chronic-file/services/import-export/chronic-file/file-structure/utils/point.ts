import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

export interface IPoint {
  x: number;
  y: number;
}

export const exportToBuffer = (point: { x: number; y: number }): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(point.x).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(point.y).toBuffer()]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer): IPoint => {
  const x = types.QDouble.read(buffer);
  const y = types.QDouble.read(buffer);
  return {
    x,
    y,
  };
};
