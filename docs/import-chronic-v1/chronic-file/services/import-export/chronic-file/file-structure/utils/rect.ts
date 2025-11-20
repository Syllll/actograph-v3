import qtdatastream from '../../qtdatastream';
const types = qtdatastream.types;

export interface IRect {
  left: number;
  top: number;
  bottom: number;
  right: number;
}

export const exportToBuffer = (rect: IRect): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QInt(rect.left).toBuffer()]);
  Buffer.concat([buffer, new types.QInt(rect.top).toBuffer()]);
  Buffer.concat([buffer, new types.QInt(rect.right).toBuffer()]);
  Buffer.concat([buffer, new types.QInt(rect.bottom).toBuffer()]);

  return buffer;
};

export const importFromBuffer = (buffer: Buffer): IRect => {
  const left = types.QInt.read(buffer);
  const top = types.QInt.read(buffer);
  const right = types.QInt.read(buffer);
  const bottom = types.QInt.read(buffer);

  return {
    left,
    top,
    bottom,
    right,
  };
};
