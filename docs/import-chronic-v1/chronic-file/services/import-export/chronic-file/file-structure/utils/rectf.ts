import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

export interface IRectF {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const exportToBuffer = (rect: IRectF): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(rect.x).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(rect.y).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(rect.width).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(rect.height).toBuffer()]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer): IRectF => {
  const x = types.QDouble.read(buffer);
  const y = types.QDouble.read(buffer);
  const width = types.QDouble.read(buffer);
  const height = types.QDouble.read(buffer);

  return {
    x,
    y,
    width,
    height,
  };
};
