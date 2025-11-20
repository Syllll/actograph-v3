import qtdatastream from '../qtdatastream';
const types = qtdatastream.types;

export interface IExtensionData {
  version: number;
  extensions: {
    [key: string]: any;
  };
}

export const exportToBuffer = (
  extensionData: IExtensionData,
  options: {},
): Buffer => {
  const buffer = Buffer.from([]);

  Buffer.concat([
    buffer,
    new types.QDouble(extensionData.version ?? 1).toBuffer(),
  ]);
  Buffer.concat([buffer, new types.QMap(extensionData.extensions).toBuffer()]);

  return buffer;
};

export const importFromBuffer = (
  buffer: Buffer,
  options: {},
): IExtensionData => {
  const version = types.QDouble.read(buffer);
  let extensions: { [key: string]: any } = {};

  if (version === 1) {
    extensions = types.QMap.read(buffer);
  } else {
    throw new Error(`Version ${version} is not supported`);
  }

  return {
    version,
    extensions,
  };
};
