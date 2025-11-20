import qtdatastream from '../../../qtdatastream';
const types = qtdatastream.types;

export interface ITickLabel {
  name: string;
  preDist: number;
}

export interface ITimeInterval {
  version: number;
  refDateTime: Date;
}

export const exportTickLabelToBuffer = (tickLabel: ITickLabel): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QString(tickLabel.name).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(tickLabel.preDist).toBuffer()]);

  return buffer;
};

export const importTickLabelFromBuffer = (buffer: Buffer): ITickLabel => {
  const name = types.QString.read(buffer);
  const preDist = types.QDouble.read(buffer);

  return {
    name,
    preDist,
  };
};

export const exportTimeIntervalToBuffer = (t: ITimeInterval): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([buffer, new types.QDouble(t.version).toBuffer()]);
  Buffer.concat([buffer, new types.QDouble(t.refDateTime).toBuffer()]);

  return buffer;
};

export const importTimeIntervalFromBuffer = (buffer: Buffer): ITimeInterval => {
  const version = types.QDouble.read(buffer);

  if (version === 0.1) {
    const refDateTime = types.QDateTime.read(buffer);
    return {
      version,
      refDateTime,
    };
  } else {
    throw new Error(`Version ${version} is not supported`);
  }
};
